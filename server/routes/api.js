const express = require('express');
const axios = require('axios');
const { requestStore } = require('../middleware/requestId');

axios.defaults.timeout = 30000; // 30s timeout to prevent hanging connections
axios.defaults.retry = 3;
axios.defaults.retryDelay = 1000;

// Request Interceptor: propagate request ID to Python backend
axios.interceptors.request.use((config) => {
  const reqId = requestStore.getStore();
  if (reqId) {
    config.headers['X-Request-ID'] = reqId;
  }
  return config;
});

axios.interceptors.response.use(null, async (error) => {
  const config = error.config;
  if (!config || !config.retry) return Promise.reject(error);
  
  // Only retry on network errors or 5xx server errors
  const shouldRetry = !error.response || error.response.status >= 500;
  if (!shouldRetry) return Promise.reject(error);
  
  config.__retryCount = config.__retryCount || 0;
  if (config.__retryCount >= config.retry) {
    return Promise.reject(error);
  }
  
  config.__retryCount += 1;
  const delay = config.retryDelay * Math.pow(2, config.__retryCount - 1); // Exponential backoff
  
  await new Promise(resolve => setTimeout(resolve, delay));
  return axios(config);
});

const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const Job = require('../models/Job');
const SharedCode = require('../models/SharedCode');
const ProjectVersion = require('../models/ProjectVersion');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const auth = require('../middleware/auth');
const quota = require('../middleware/quota');
const { validate, rules } = require('../middleware/validate');
const { encrypt, decrypt } = require('../utils/crypto');
const { trackEvent } = require('../utils/analytics');
const rateLimiter = require('../middleware/rateLimiter');
const { queue } = require('../queue/simulationQueue');

const simulationLimiter = rateLimiter.simulation();
const shareLimiter = rateLimiter.share();

// Tighter body limit for compiler routes (circuits shouldn't exceed 100KB in JSON)
const compilerBodyParser = require('express').json({ limit: '100kb' });

// The base URL for your Python compiler service
const PYTHON_API_URL = 'http://localhost:5001';

/**
 * ========================================
 * Project Routes (for saving/loading code)
 * ========================================
 */
router.post('/projects', auth, validate(rules.saveProject), async (req, res) => {
  try {
    const project = new Project({
      name: req.body.name || 'Untitled Project',
      code: req.body.code,
      user: req.user.id,
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/projects', auth, async (req, res) => {
  try {
    const projects = await Project.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user.toString() !== req.user.id) return res.status(401).json({ error: 'Not authorized' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/projects/:id', auth, validate(rules.renameProject), async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user.toString() !== req.user.id) return res.status(401).json({ error: 'Not authorized' });

    // If code is changing, save the current code state to ProjectVersion first
    if (req.body.code !== undefined && req.body.code !== project.code) {
      const version = new ProjectVersion({
        project: project._id,
        code: project.code, // Save previous code
        message: req.body.versionMessage || 'Automatic snapshot'
      });
      await version.save();

      // Enforce the 50 versions cap
      const versions = await ProjectVersion.find({ project: project._id }).sort({ createdAt: -1 });
      if (versions.length > 50) {
        const toDeleteIds = versions.slice(50).map(v => v._id);
        await ProjectVersion.deleteMany({ _id: { $in: toDeleteIds } });
      }

      project.code = req.body.code;
    }

    project.name = req.body.name || project.name;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user.toString() !== req.user.id) return res.status(401).json({ error: 'Not authorized' });

    await project.deleteOne();
    res.json({ message: 'Project removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get project version history (paginated)
router.get('/projects/:id/versions', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user.toString() !== req.user.id) return res.status(401).json({ error: 'Not authorized' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const versions = await ProjectVersion.find({ project: project._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ProjectVersion.countDocuments({ project: project._id });

    res.json({
      versions,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalVersions: total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore project code to a specific historical version
router.post('/projects/:id/restore/:versionId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user.toString() !== req.user.id) return res.status(401).json({ error: 'Not authorized' });

    const version = await ProjectVersion.findOne({ _id: req.params.versionId, project: project._id });
    if (!version) return res.status(404).json({ error: 'Version not found for this project' });

    // Save current state as backup first
    const backupVersion = new ProjectVersion({
      project: project._id,
      code: project.code,
      message: `Pre-restore backup of ${new Date().toLocaleDateString()}`
    });
    await backupVersion.save();

    project.code = version.code;
    await project.save();

    res.json({ message: 'Project restored successfully', code: project.code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ========================================
 * Compiler Proxy Routes
 * ========================================
 */
router.post('/run/parse', compilerBodyParser, validate(rules.parse), async (req, res) => {
  const start = Date.now();
  try {
    const { code } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/parse`, { code });
    trackEvent('parse', req.user ? req.user.id : null, {
      durationMs: Date.now() - start,
      codeLength: code.length
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || err.message;
    res.status(status).json({ error });
  }
});

router.post('/run/compile', auth, quota('compile'), compilerBodyParser, validate(rules.compile), async (req, res) => {
  const start = Date.now();
  try {
    const { ast } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/compile`, { ast });
    trackEvent('compile', req.user.id, {
      durationMs: Date.now() - start,
      qubitCount: response.data.ir?.qubits?.length || 0,
      gateCount: response.data.ir?.instructions?.length || 0
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || err.message;
    res.status(status).json({ error });
  }
});

router.post('/run/transpile', compilerBodyParser, validate(rules.ir), async (req, res) => {
  const start = Date.now();
  try {
    const { ir } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/transpile`, { ir });
    trackEvent('transpile', req.user ? req.user.id : null, {
      durationMs: Date.now() - start,
      qubitCount: ir.qubits?.length || 0
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || err.message;
    res.status(status).json({ error });
  }
});

router.post('/run/debug/step', compilerBodyParser, validate(rules.debugStep), async (req, res) => {
  const start = Date.now();
  try {
    const { ir, index, theme, sessionId } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/debug/step`, { ir, index, theme });
    trackEvent('debugStep', req.user ? req.user.id : null, {
      durationMs: Date.now() - start,
      stepIndex: index
    });
    
    if (sessionId) {
      const { broadcastDebugUpdate } = require('./sse');
      broadcastDebugUpdate(sessionId, response.data);
      return res.json({ status: 'broadcasted' });
    }

    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || err.message;
    res.status(status).json({ error });
  }
});

// For images, we pipe the stream directly from Python to the client
router.post('/run/visualize', compilerBodyParser, validate(rules.ir), async (req, res) => {
  const start = Date.now();
  try {
    const { ir, theme } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/visualize`, { ir, theme }, {
      responseType: 'stream'
    });
    trackEvent('visualize', req.user ? req.user.id : null, {
      durationMs: Date.now() - start,
      qubitCount: ir.qubits?.length || 0
    });
    res.setHeader('Content-Type', 'image/png');
    response.data.pipe(res);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error visualizing circuit';
    res.status(status).json({ error });
  }
});

router.post('/run/simulate', auth, quota('simulate'), simulationLimiter, compilerBodyParser, validate(rules.ir), async (req, res) => {
  const start = Date.now();
  try {
    const { ir, backend, theme } = req.body;
    
    if (!queue) {
      // Fallback to synchronous execution if queue system is unavailable (e.g. Redis is down)
      console.warn('[WARNING] Redis is unavailable, falling back to synchronous simulation');
      const response = await axios.post(`${PYTHON_API_URL}/simulate`, { ir, backend, theme }, {
        responseType: 'stream'
      });
      trackEvent('simulate', req.user.id, {
        durationMs: Date.now() - start,
        qubitCount: ir.qubits?.length || 0,
        backend,
        fallbackSync: true
      });
      res.setHeader('Content-Type', 'image/png');
      return response.data.pipe(res);
    }

    const job = await queue.add('simulate', {
      ir,
      backend,
      theme,
      requestId: req.requestId,
      userId: req.user.id
    });

    trackEvent('simulate', req.user.id, {
      durationMs: Date.now() - start,
      qubitCount: ir.qubits?.length || 0,
      backend,
      queued: true
    });

    res.status(202).json({ jobId: job.id, status: 'queued' });
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error simulating circuit';
    res.status(status).json({ error });
  }
});

router.get('/run/simulate/status/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!queue) {
      return res.status(503).json({ error: 'Queue system is offline' });
    }
    const job = await queue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const state = await job.getState();
    if (state === 'completed') {
      const base64Data = job.returnvalue;
      const imgBuffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'image/png');
      return res.send(imgBuffer);
    } else if (state === 'failed') {
      return res.status(500).json({ status: 'failed', error: job.failedReason || 'Job execution failed' });
    }
    res.json({ status: state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/run/bloch', compilerBodyParser, async (req, res) => {
  const start = Date.now();
  try {
    const { statevector, num_qubits, title, theme } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/bloch`, { statevector, num_qubits, title, theme }, {
      responseType: 'stream'
    });
    trackEvent('bloch', req.user ? req.user.id : null, {
      durationMs: Date.now() - start,
      qubitCount: num_qubits
    });
    res.setHeader('Content-Type', 'image/png');
    response.data.pipe(res);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error generating Bloch Sphere';
    res.status(status).json({ error });
  }
});

/**
 * ========================================
 * Cloud & Job Routes
 * ========================================
 */

// Get user's IBM Token
router.get('/user/token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ ibmToken: decrypt(user.ibmToken) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user's IBM Token
router.post('/user/token', auth, validate(rules.ibmToken), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.ibmToken = encrypt(req.body.ibmToken);
    await user.save();
    res.json({ message: 'Token updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a job to IBM Cloud (Admin only)
router.post('/cloud/submit', auth, auth.requireRole('admin'), validate(rules.cloudSubmit), async (req, res) => {
  const start = Date.now();
  try {
    const { ir, backend, projectName } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user.ibmToken) {
      return res.status(400).json({ error: 'IBM API Token is required. Please set it in your profile.' });
    }

    const decryptedToken = decrypt(user.ibmToken);

    // 1. Submit to Python API
    const response = await axios.post(`${PYTHON_API_URL}/cloud/submit`, {
      ir,
      token: decryptedToken,
      backend
    });

    if (response.data.error) {
      return res.status(400).json({ error: response.data.error });
    }

    // 2. Save job to database
    const job = new Job({
      user: user.id,
      jobId: response.data.job_id,
      backend: response.data.backend || backend,
      status: response.data.status,
      projectName: projectName || 'Untitled Hardware Run'
    });
    await job.save();

    trackEvent('cloudSubmit', req.user.id, {
      durationMs: Date.now() - start,
      backend,
      qubitCount: ir.qubits?.length || 0
    });

    res.json(job);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || err.message;
    res.status(status).json({ error });
  }
});

// Get user's cloud jobs
router.get('/cloud/jobs', auth, async (req, res) => {
  try {
    const jobs = await Job.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync job status for all non-completed jobs (Admin only)
router.post('/cloud/sync', auth, auth.requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const pendingJobs = await Job.find({ 
      user: req.user.id, 
      status: { $nin: ['COMPLETED', 'ERROR', 'DONE'] } 
    });

    const decryptedToken = decrypt(user.ibmToken);

    const results = [];
    for (const job of pendingJobs) {
      try {
        const response = await axios.post(`${PYTHON_API_URL}/cloud/status`, {
          jobId: job.jobId,
          token: decryptedToken
        });

        if (response.data.status) {
          job.status = response.data.status;
          
          // If completed, fetch results
          if (response.data.status === 'COMPLETED' || response.data.status === 'DONE') {
            const resData = await axios.post(`${PYTHON_API_URL}/cloud/result`, {
              jobId: job.jobId,
              token: decryptedToken
            });
            if (resData.data.counts) {
              job.results = resData.data.counts;
            }
          }
          await job.save();
        }
        results.push(job);
      } catch (jobErr) {
        console.error(`Error syncing job ${job.jobId}:`, jobErr.message);
      }
    }

    res.json({ message: 'Sync complete', jobs: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reverse Transpile OpenQASM to QuCPL
router.post('/run/transpile/reverse', validate(rules.reverseTranspile), async (req, res) => {
  try {
    const { qasm } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/transpile/reverse`, { qasm });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error reverse transpiling QASM';
    res.status(status).json({ error });
  }
});

// Optimize IR
router.post('/run/optimize', validate(rules.ir), async (req, res) => {
  try {
    const { ir } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/optimize`, { ir });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error optimizing IR';
    res.status(status).json({ error });
  }
});

// Get quantum algorithm library
router.get('/run/algorithms', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/algorithms`, {
      params: req.query
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error retrieving algorithms';
    res.status(status).json({ error });
  }
});

// Get Bloch Sphere image
router.post('/run/bloch', validate(rules.bloch), async (req, res) => {
  try {
    const { statevector, num_qubits, title, theme } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/bloch`, { statevector, num_qubits, title, theme }, {
      responseType: 'stream'
    });
    res.setHeader('Content-Type', 'image/png');
    response.data.pipe(res);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error generating Bloch Sphere';
    res.status(status).json({ error });
  }
});

// Share code snippet (no auth required, rate limited)
router.post('/share', shareLimiter, async (req, res) => {
  const start = Date.now();
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    const shared = new SharedCode({ code });
    await shared.save();

    trackEvent('share', req.user ? req.user.id : null, {
      durationMs: Date.now() - start,
      codeLength: code.length
    });

    res.status(201).json({ id: shared._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve shared code snippet (no auth required)
router.get('/share/:id', async (req, res) => {
  try {
    const shared = await SharedCode.findById(req.params.id);
    if (!shared) {
      return res.status(404).json({ error: 'Shared code not found' });
    }
    res.json({ code: shared.code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user quota limits and usage
router.get('/user/quota', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const UsageQuota = require('../models/UsageQuota');
    const User = require('../models/User');
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const usage = await UsageQuota.findOne({ userId: req.user.id, date: today });
    const tier = user.role === 'admin' ? 'admin' : (user.tier || 'free');

    const limits = {
      free: { simulate: 10, compile: 50, maxQubits: 15 },
      pro: { simulate: 100, compile: Infinity, maxQubits: 25 },
      admin: { simulate: Infinity, compile: Infinity, maxQubits: Infinity }
    }[tier];

    res.json({
      tier,
      limits,
      usage: {
        simulate: usage ? usage.simCount : 0,
        compile: usage ? usage.compileCount : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
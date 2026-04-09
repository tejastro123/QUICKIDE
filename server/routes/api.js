const express = require('express');
const axios = require('axios');
const router = express.Router();
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// The base URL for your Python compiler service
const PYTHON_API_URL = 'http://localhost:5001';

/**
 * ========================================
 * Project Routes (for saving/loading code)
 * ========================================
 */
router.post('/projects', auth, async (req, res) => {
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

router.put('/projects/:id', auth, async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user.toString() !== req.user.id) return res.status(401).json({ error: 'Not authorized' });

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

/**
 * ========================================
 * Compiler Proxy Routes
 * ========================================
 */
router.post('/run/parse', async (req, res) => {
  try {
    const { code } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/parse`, { code });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || err.message;
    res.status(status).json({ error });
  }
});

router.post('/run/compile', async (req, res) => {
  try {
    const { ast } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/compile`, { ast });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || err.message;
    res.status(status).json({ error });
  }
});

router.post('/run/transpile', async (req, res) => {
  try {
    const { ir } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/transpile`, { ir });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || err.message;
    res.status(status).json({ error });
  }
});

router.post('/run/debug/step', async (req, res) => {
  try {
    const { ir, index } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/debug/step`, { ir, index });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || err.message;
    res.status(status).json({ error });
  }
});

// For images, we pipe the stream directly from Python to the client
router.post('/run/visualize', async (req, res) => {
  try {
    const { ir } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/visualize`, { ir }, {
      responseType: 'stream'
    });
    res.setHeader('Content-Type', 'image/png');
    response.data.pipe(res);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error visualizing circuit';
    res.status(status).json({ error });
  }
});

router.post('/run/simulate', async (req, res) => {
  try {
    const { ir, backend } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/simulate`, { ir, backend }, {
      responseType: 'stream'
    });
    res.setHeader('Content-Type', 'image/png');
    response.data.pipe(res);
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error simulating circuit';
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
    res.json({ ibmToken: user.ibmToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user's IBM Token
router.post('/user/token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.ibmToken = req.body.ibmToken;
    await user.save();
    res.json({ message: 'Token updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a job to IBM Cloud
router.post('/cloud/submit', auth, async (req, res) => {
  try {
    const { ir, backend, projectName } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user.ibmToken) {
      return res.status(400).json({ error: 'IBM API Token is required. Please set it in your profile.' });
    }

    // 1. Submit to Python API
    const response = await axios.post(`${PYTHON_API_URL}/cloud/submit`, {
      ir,
      token: user.ibmToken,
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

// Sync job status for all non-completed jobs
router.post('/cloud/sync', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const pendingJobs = await Job.find({ 
      user: req.user.id, 
      status: { $nin: ['COMPLETED', 'ERROR', 'DONE'] } 
    });

    const results = [];
    for (const job of pendingJobs) {
      try {
        const response = await axios.post(`${PYTHON_API_URL}/cloud/status`, {
          jobId: job.jobId,
          token: user.ibmToken
        });

        if (response.data.status) {
          job.status = response.data.status;
          
          // If completed, fetch results
          if (response.data.status === 'COMPLETED' || response.data.status === 'DONE') {
            const resData = await axios.post(`${PYTHON_API_URL}/cloud/result`, {
              jobId: job.jobId,
              token: user.ibmToken
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

module.exports = router;
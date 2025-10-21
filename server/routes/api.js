const express = require('express');
const axios = require('axios');
const router = express.Router();
const Project = require('../models/Project');

// The base URL for your Python compiler service
const PYTHON_API_URL = 'http://localhost:5001';

/**
 * ========================================
 * Project Routes (for saving/loading code)
 * ========================================
 */
router.post('/projects', async (req, res) => {
  try {
    const project = new Project({
      name: req.body.name || 'Untitled Project',
      code: req.body.code,
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
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
    // Forward the request to the Python API
    const response = await axios.post(`${PYTHON_API_URL}/parse`, { code });
    res.json(response.data);
  } catch (err) {
    // Handle errors from the Python service
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

// For images, we pipe the stream directly from Python to the client
router.post('/run/visualize', async (req, res) => {
  try {
    const { ir } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/visualize`, { ir }, {
      responseType: 'stream'
    });
    res.setHeader('Content-Type', 'image/png');
    response.data.pipe(res); // Pipe the image data directly
  } catch (err) {
    const status = err.response?.status || 500;
    const error = err.response?.data?.error || 'Error visualizing circuit';
    res.status(status).json({ error });
  }
});

router.post('/run/simulate', async (req, res) => {
  try {
    const { ir } = req.body;
    const response = await axios.post(`${PYTHON_API_URL}/simulate`, { ir }, {
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

module.exports = router;
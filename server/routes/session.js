const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const LiveSession = require('../models/LiveSession');
const auth = require('../middleware/auth');

// Map of sessionId -> array of response objects for collaboration
const collabClients = new Map();

// 1. Create a session
router.post('/session', auth, async (req, res) => {
  try {
    const { projectId, code } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const sessionId = crypto.randomUUID();
    const session = new LiveSession({
      sessionId,
      projectId,
      ownerId: req.user.id,
      code: code || ''
    });

    await session.save();
    res.status(201).json({ sessionId, projectId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get current session state (e.g. for initial load)
router.get('/session/:id', async (req, res) => {
  try {
    const session = await LiveSession.findOne({ sessionId: req.params.id });
    if (!session) {
      return res.status(404).json({ error: 'Collaboration session not found' });
    }
    res.json({
      sessionId: session.sessionId,
      projectId: session.projectId,
      ownerId: session.ownerId,
      code: session.code
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update session code (invoked by owner)
router.put('/session/:id', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const session = await LiveSession.findOne({ sessionId: req.params.id });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Only owner can update the session code
    if (session.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the session owner can update code' });
    }

    session.code = code;
    await session.save();

    // Broadcast update to all connected viewers
    const sessionViewers = collabClients.get(req.params.id);
    if (sessionViewers) {
      const payload = `data: ${JSON.stringify({ type: 'code_update', code })}\n\n`;
      sessionViewers.forEach(clientRes => {
        try {
          clientRes.write(payload);
        } catch (err) {
          console.error(`Error writing update to collaboration stream:`, err.message);
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. SSE Stream for viewers joining
router.get('/session/:id/stream', (req, res) => {
  const sessionId = req.params.id;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  if (!collabClients.has(sessionId)) {
    collabClients.set(sessionId, []);
  }
  collabClients.get(sessionId).push(res);

  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

  req.on('close', () => {
    clearInterval(heartbeat);
    const sessionViewers = collabClients.get(sessionId) || [];
    const index = sessionViewers.indexOf(res);
    if (index !== -1) {
      sessionViewers.splice(index, 1);
    }
    if (sessionViewers.length === 0) {
      collabClients.delete(sessionId);
    }
  });
});

module.exports = router;

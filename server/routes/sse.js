const express = require('express');
const router = express.Router();

// Map of sessionId (string) -> array of response streams (res)
const clients = new Map();

router.get('/debug/stream', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId query parameter is required' });
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // bypass Nginx buffering
  });

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  if (!clients.has(sessionId)) {
    clients.set(sessionId, []);
  }
  clients.get(sessionId).push(res);

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ status: 'connected', sessionId })}\n\n`);

  req.on('close', () => {
    clearInterval(heartbeat);
    const sessionClients = clients.get(sessionId) || [];
    const index = sessionClients.indexOf(res);
    if (index !== -1) {
      sessionClients.splice(index, 1);
    }
    if (sessionClients.length === 0) {
      clients.delete(sessionId);
    }
  });
});

// Broadcast event helper
const broadcastDebugUpdate = (sessionId, data) => {
  const sessionClients = clients.get(sessionId);
  if (sessionClients && sessionClients.length > 0) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sessionClients.forEach(res => {
      try {
        res.write(payload);
      } catch (err) {
        console.error(`Error sending SSE payload to client in session ${sessionId}:`, err.message);
      }
    });
    return true;
  }
  return false;
};

module.exports = {
  router,
  broadcastDebugUpdate
};

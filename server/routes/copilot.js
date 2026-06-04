const express = require('express');
const router = express.Router();
const axios = require('axios');
const authenticate = require('../middleware/auth');

const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';

const SYSTEM_PROMPT = `You are QuAI — the world's most advanced Quantum Computing AI Copilot,
deeply integrated into QuickIDE. You are an expert in:
- QuCPL (Quantum Circuit Programming Language): a domain-specific language where circuits
  are written as: qubit q0, q1; qop h q0; qop cx q0, q1; measure q0 -> c0;
- OpenQASM 2.0 / 3.0, Qiskit (Python), Cirq
- Quantum algorithms: Grover, QFT, Shor, VQE, QAOA, Teleportation, GHZ, Bell states
- Quantum error correction, noise models, decoherence
- IBM Quantum hardware backends

QuCPL Syntax Reference:
  qubit <id>[, <id>...];         -- declare qubits
  qop <gate> <target>[, <ctrl>]; -- apply gate
  measure <qubit> -> <cbit>;     -- measure
  Gates: h, x, y, z, cx, cy, cz, ccx, rx(θ), ry(θ), rz(θ), s, t, swap, cswap

Response style:
- Be concise but complete
- Use code blocks with language labels: qucpl, python, qasm
- For explanations, use step-by-step numbered lists
- For optimizations, show before/after
- For debugging, cite the specific problematic line/gate
- Never say "I cannot" — always provide best-effort answer`;

// ── Helper: stream Ollama /api/chat → SSE to client ──────────────────────────
async function streamChat(messages, model, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const ollamaRes = await axios.post(
    `${OLLAMA_BASE}/api/chat`,
    { model: model || 'llama3', messages, stream: true },
    { responseType: 'stream', timeout: 120000 }
  );

  ollamaRes.data.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          res.write(`data: ${JSON.stringify({ token: json.message.content })}\n\n`);
        }
        if (json.done) {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        }
      } catch (_) {}
    }
  });

  ollamaRes.data.on('end', () => {
    if (!res.writableEnded) res.end();
  });

  ollamaRes.data.on('error', (err) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  });
}

// ── POST /api/copilot/chat ────────────────────────────────────────────────────
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, context = {}, history = [], model } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const contextStr = [
      context.code ? `Current QuCPL code:\n\`\`\`qucpl\n${context.code}\n\`\`\`` : '',
      context.error ? `Runtime error: ${context.error}` : '',
      context.selectedText ? `User selected:\n\`\`\`\n${context.selectedText}\n\`\`\`` : '',
    ].filter(Boolean).join('\n\n');

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(contextStr ? [{ role: 'system', content: `Context:\n${contextStr}` }] : []),
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    await streamChat(messages, model, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

// ── POST /api/copilot/explain ─────────────────────────────────────────────────
router.post('/explain', authenticate, async (req, res) => {
  try {
    const { code, model } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Explain this QuCPL circuit step by step. Include: what each gate does to the qubit state, which algorithm pattern this resembles, the final probability distribution, and any entanglement created.\n\n\`\`\`qucpl\n${code}\n\`\`\`` },
    ];
    await streamChat(messages, model, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

// ── POST /api/copilot/debug ───────────────────────────────────────────────────
router.post('/debug', authenticate, async (req, res) => {
  try {
    const { code, error, model } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Debug this QuCPL circuit. Identify ALL issues: invalid gate usage, qubit reuse after measurement, redundant gates, decoherence risks, circuit depth inefficiencies, measurement ordering problems. For each bug show the exact line and fix.\n\n\`\`\`qucpl\n${code}\n\`\`\`${error ? `\n\nRuntime error: ${error}` : ''}` },
    ];
    await streamChat(messages, model, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

// ── POST /api/copilot/optimize ────────────────────────────────────────────────
router.post('/optimize', authenticate, async (req, res) => {
  try {
    const { code, model } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Optimize this QuCPL circuit. Remove redundant gates (H·H=I, X·X=I, etc.), reduce circuit depth, merge rotations. Show the optimized code and explain each optimization.\n\n\`\`\`qucpl\n${code}\n\`\`\`` },
    ];
    await streamChat(messages, model, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

// ── POST /api/copilot/generate ────────────────────────────────────────────────
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { prompt, model } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Generate complete, correct QuCPL code for: "${prompt}"\n\nRequirements:\n- Declare all qubits first\n- Apply gates in correct order\n- Add measurements if appropriate\n- Add brief inline comments explaining key steps\n- Return only the QuCPL code block` },
    ];
    await streamChat(messages, model, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

// ── POST /api/copilot/translate ───────────────────────────────────────────────
router.post('/translate', authenticate, async (req, res) => {
  try {
    const { code, from = 'qucpl', to = 'qiskit', model } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Translate this ${from.toUpperCase()} circuit to ${to.toUpperCase()}. Preserve all gate semantics, measurements, and parameterized gates exactly.\n\n\`\`\`${from}\n${code}\n\`\`\`\n\nReturn only the translated code in a properly labeled code block.` },
    ];
    await streamChat(messages, model, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

// ── POST /api/copilot/complete ────────────────────────────────────────────────
router.post('/complete', authenticate, async (req, res) => {
  try {
    const { prefix, suffix = '', model } = req.body;
    if (!prefix) return res.status(400).json({ suggestions: [] });

    const prompt = `${SYSTEM_PROMPT}

You are completing a QuCPL program. Return ONLY a JSON array of up to 5 completion objects.
Each object: { "text": "<completion>", "label": "<short label>", "detail": "<one-line explanation>" }

Code before cursor:
\`\`\`qucpl
${prefix.slice(-400)}
\`\`\`

Return only valid JSON array, no other text.`;

    const r = await axios.post(
      `${OLLAMA_BASE}/api/generate`,
      { model: model || 'llama3', prompt, stream: false, options: { temperature: 0.1 } },
      { timeout: 30000 }
    );
    const raw = r.data.response || '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    const suggestions = match ? JSON.parse(match[0]) : [];
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ suggestions: [], error: err.message });
  }
});

// ── GET /api/copilot/models ───────────────────────────────────────────────────
router.get('/models', authenticate, async (req, res) => {
  try {
    const r = await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 5000 });
    const models = (r.data.models || []).map(m => ({ name: m.name, size: m.size }));
    res.json({ models });
  } catch (err) {
    // Ollama not running — return default so UI still works
    res.json({ models: [{ name: 'llama3', size: 0 }] });
  }
});

module.exports = router;

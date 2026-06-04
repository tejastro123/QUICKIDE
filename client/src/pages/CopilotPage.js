import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './CopilotPage.css';
import { AuthContext } from '../context/AuthContext';

// Icons (inline SVG snippets to avoid extra deps)
const Icon = ({ d, size = 16, color = 'currentColor', ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d={d} />
  </svg>
);

const Icons = {
  chat:     'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  explain:  'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3M6.343 6.343l-.707-.707M6.343 17.657l-.707.707M15.536 8.464a5 5 0 1 1-7.072 7.072',
  debug:    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  optimize: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  generate: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  translate:'M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6',
  hardware: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
  send:     'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  copy:     'M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z',
  bot:      'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z',
  user:     'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  clear:    'M18 6L6 18M6 6l12 12',
  zap:      'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
};

const SERVER = 'http://localhost:5000';

const MODES = [
  { id: 'chat',      label: 'AI Chat',       icon: Icons.chat,     color: '#8b5cf6' },
  { id: 'explain',   label: 'Explain Circuit',icon: Icons.explain,  color: '#38bdf8' },
  { id: 'debug',     label: 'Debug Circuit',  icon: Icons.debug,    color: '#f87171' },
  { id: 'optimize',  label: 'Optimize',       icon: Icons.optimize, color: '#fbbf24' },
  { id: 'generate',  label: 'NL → QuCPL',     icon: Icons.generate, color: '#34d399' },
  { id: 'translate', label: 'Translate',      icon: Icons.translate,color: '#a78bfa' },
  { id: 'hardware',  label: 'Hardware Advisor',icon: Icons.hardware, color: '#f472b6' },
];

const SUGGESTIONS = [
  'Explain Bell state preparation',
  'Create a 3-qubit GHZ state',
  'Debug my circuit for measurement order issues',
  'What is quantum decoherence?',
  "Optimize my circuit's gate count",
  'Translate this to Qiskit Python',
  'Which IBM backend is best for 5 qubits?',
  "How does Grover's algorithm work?",
];

const TRANSLATE_LANGS = ['qucpl','qasm','qiskit','cirq'];

// ── Markdown renderer ────────────────────────────────────────────────────────
function MdContent({ content, streaming }) {
  return (
    <div className={streaming ? 'streaming-cursor' : ''}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, children }) {
            return inline
              ? <code>{children}</code>
              : <pre><code>{children}</code></pre>;
          },
        }}
      >{content}</ReactMarkdown>
    </div>
  );
}

// ── Stream helper ─────────────────────────────────────────────────────────────
async function streamRequest(url, body, tokenArg, onChunk, onDone, onError) {
  const token = tokenArg || localStorage.getItem('token');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) { onError(`Server ${res.status}: Unauthorized — please log in`); return; }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        try {
          const j = JSON.parse(line.slice(5).trim());
          if (j.token) onChunk(j.token);
          if (j.done) { onDone(); return; }
        } catch (_) {}
      }
    }
    onDone();
  } catch (e) { onError(e.message); }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CopilotPage({ code: editorCode = '' }) {
  const { token } = useContext(AuthContext);
  const [mode, setMode]           = useState('chat');
  const [model, setModel]         = useState('llama3');
  const [models, setModels]       = useState([{ name: 'llama3' }]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError]         = useState('');

  // Chat state
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [useCode, setUseCode]     = useState(false);
  const messagesEndRef = useRef(null);

  // Tool state (non-chat modes)
  const [toolCode, setToolCode]     = useState('');
  const [toolExtra, setToolExtra]   = useState('');
  const [toolOutput, setToolOutput] = useState('');
  const [fromLang, setFromLang]     = useState('qucpl');
  const [toLang, setToLang]         = useState('qiskit');
  const [copied, setCopied]         = useState(false);

  // Fetch available models
  useEffect(() => {
    const t = token || localStorage.getItem('token');
    if (!t) return;
    fetch(`${SERVER}/api/copilot/models`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => { if (d.models?.length) setModels(d.models); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Chat send ───────────────────────────────────────────────────────────────
  const sendChat = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || streaming) return;
    setInput('');
    setError('');

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: msg }]);

    const aiMsg = { role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, aiMsg]);
    setStreaming(true);

    const context = {};
    if (useCode && editorCode) context.code = editorCode;

    await streamRequest(
      `${SERVER}/api/copilot/chat`,
      { message: msg, context, history, model },
      token,
      (chunk) => setMessages(prev => {
        const copy = [...prev];
        const last = { ...copy[copy.length - 1] };
        last.content += chunk;
        last.loading = false;
        copy[copy.length - 1] = last;
        return copy;
      }),
      () => {
        setStreaming(false);
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], loading: false };
          return copy;
        });
      },
      (err) => { setError(err); setStreaming(false); }
    );
  }, [input, messages, streaming, useCode, editorCode, model, token]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  };

  // ── Tool run ────────────────────────────────────────────────────────────────
  const runTool = useCallback(async () => {
    if (streaming) return;
    setToolOutput('');
    setError('');
    setStreaming(true);

    const endpoints = {
      explain:   { url: `${SERVER}/api/copilot/explain`,  body: { code: toolCode || editorCode, model } },
      debug:     { url: `${SERVER}/api/copilot/debug`,    body: { code: toolCode || editorCode, error: toolExtra, model } },
      optimize:  { url: `${SERVER}/api/copilot/optimize`, body: { code: toolCode || editorCode, model } },
      generate:  { url: `${SERVER}/api/copilot/generate`, body: { prompt: toolExtra || toolCode, model } },
      translate: { url: `${SERVER}/api/copilot/translate`,body: { code: toolCode || editorCode, from: fromLang, to: toLang, model } },
      hardware:  {
        url: `${SERVER}/api/copilot/chat`,
        body: {
          message: `As a hardware advisor: ${toolExtra || 'analyze my circuit for IBM hardware deployment.'} ${toolCode ? `Circuit:\n\`\`\`qucpl\n${toolCode}\n\`\`\`` : ''}`,
          context: {}, history: [], model,
        },
      },
    };

    const { url, body } = endpoints[mode] || endpoints.chat;

    await streamRequest(url, body, token,
      (chunk) => setToolOutput(prev => prev + chunk),
      () => setStreaming(false),
      (err) => { setError(err); setStreaming(false); }
    );
  }, [mode, toolCode, toolExtra, editorCode, fromLang, toLang, model, token, streaming]);

  const copyOutput = () => {
    navigator.clipboard.writeText(toolOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const clearChat = () => setMessages([]);

  // ── Quick actions inject into chat ─────────────────────────────────────────
  const quickActions = [
    { label: '🔍 Explain my circuit', msg: 'Explain my current circuit step by step.' },
    { label: '🐛 Debug issues',       msg: 'Find all bugs and issues in my circuit.' },
    { label: '⚡ Optimize gates',      msg: 'Optimize my circuit to reduce gate count.' },
    { label: '🌐 Suggest algorithm',   msg: 'What quantum algorithm does my circuit implement?' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  const currentMode = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <div className="copilot-page">
      {/* Sidebar */}
      <aside className="copilot-sidebar">
        <div className="copilot-sidebar-header">
          <div className="copilot-logo">
            <div className="copilot-logo-icon">
              <Icon d={Icons.bot} size={18} color="white" />
            </div>
            <span className="copilot-logo-text">QuAI</span>
          </div>
          <div className="copilot-tagline">Quantum AI Copilot</div>
        </div>

        <nav className="copilot-nav">
          <div className="copilot-nav-section-label">Modes</div>
          {MODES.map(m => (
            <button key={m.id}
              className={`copilot-nav-btn${mode === m.id ? ' active' : ''}`}
              onClick={() => { setMode(m.id); setError(''); setToolOutput(''); }}
            >
              <Icon d={m.icon} size={15} className="nav-icon"
                color={mode === m.id ? m.color : 'currentColor'} />
              {m.label}
            </button>
          ))}
        </nav>

        <div className="copilot-model-select-wrap">
          <div className="copilot-model-label">Model</div>
          <select className="copilot-model-select" value={model} onChange={e => setModel(e.target.value)}>
            {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
        </div>
      </aside>

      {/* Main */}
      <main className="copilot-main">
        {error && (
          <div className="copilot-banner error">
            <Icon d="M12 8v4M12 16h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={14} />
            {error}
          </div>
        )}

        {/* ── CHAT MODE ── */}
        {mode === 'chat' && (
          <div className="chat-panel">
            {/* Quick actions */}
            <div className="quick-actions">
              {quickActions.map(q => (
                <button key={q.label} className="quick-action-btn"
                  onClick={() => { setInput(q.msg); }}>
                  {q.label}
                </button>
              ))}
              <button className="quick-action-btn" onClick={clearChat}
                style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                <Icon d={Icons.clear} size={12} /> Clear
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-welcome">
                  <div className="chat-welcome-orb" />
                  <h2>QuAI Quantum Copilot</h2>
                  <p>Your senior quantum engineer — ask anything about circuits, algorithms, debugging, or quantum mechanics.</p>
                  <div className="chat-suggestions">
                    {SUGGESTIONS.map(s => (
                      <button key={s} className="chat-suggestion-btn"
                        onClick={() => sendChat(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  <div className={`chat-avatar ${msg.role === 'user' ? 'user-av' : 'ai'}`}>
                    {msg.role === 'user'
                      ? <Icon d={Icons.user} size={14} />
                      : <Icon d={Icons.bot} size={14} color="white" />
                    }
                  </div>
                  <div className="chat-bubble">
                    {msg.loading && !msg.content
                      ? <div className="typing-indicator">
                          <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                        </div>
                      : <MdContent content={msg.content} streaming={streaming && i === messages.length - 1 && msg.role === 'assistant'} />
                    }
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <div className="chat-context-bar">
                <button
                  className={`context-chip${useCode ? ' active' : ''}`}
                  onClick={() => setUseCode(v => !v)}
                  title="Include current editor code as context"
                >
                  <Icon d={Icons.zap} size={10} />
                  {useCode ? 'Code context ON' : 'Include code context'}
                </button>
              </div>
              <div className="chat-input-row">
                <textarea
                  className="chat-textarea"
                  placeholder="Ask anything about quantum computing, QuCPL, or your circuit… (Enter to send)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={streaming}
                />
                <button className="chat-send-btn" onClick={() => sendChat()} disabled={streaming || !input.trim()}>
                  {streaming
                    ? <div className="btn-spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />
                    : <Icon d={Icons.send} size={16} color="white" />
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOOL MODES ── */}
        {mode !== 'chat' && (
          <div className="tool-panel">
            <div className="tool-panel-header">
              <div className="tool-panel-icon"
                style={{ background: `${currentMode.color}22`, border: `1px solid ${currentMode.color}44` }}>
                <Icon d={currentMode.icon} size={18} color={currentMode.color} />
              </div>
              <div>
                <div className="tool-panel-title">{currentMode.label}</div>
                <div className="tool-panel-sub">
                  {mode === 'explain'   && 'Paste circuit or use editor code → get step-by-step explanation'}
                  {mode === 'debug'     && 'Detect bugs, gate errors, decoherence risks, and measurement issues'}
                  {mode === 'optimize'  && 'Reduce gate count and circuit depth automatically'}
                  {mode === 'generate'  && 'Describe a quantum circuit in plain English → get QuCPL code'}
                  {mode === 'translate' && 'Convert between QuCPL, OpenQASM, Qiskit, and Cirq'}
                  {mode === 'hardware'  && 'IBM backend selection, noise estimates, and fidelity warnings'}
                </div>
              </div>
            </div>

            <div className="tool-panel-body">
              {/* Input column */}
              <div className="tool-input-col">

                {/* Code input (not for generate) */}
                {mode !== 'generate' && (
                  <>
                    <div className="tool-field-label">
                      {mode === 'translate' ? 'Source Circuit' : 'QuCPL Circuit'}
                    </div>
                    <textarea className="tool-code-input"
                      placeholder={editorCode
                        ? '(leave blank to use editor code)'
                        : 'qubit q0, q1;\nqop h q0;\nqop cx q0, q1;\nmeasure q0 -> c0;'}
                      value={toolCode}
                      onChange={e => setToolCode(e.target.value)}
                    />
                  </>
                )}

                {/* Language selectors for translate */}
                {mode === 'translate' && (
                  <>
                    <div className="tool-field-label">From</div>
                    <select className="tool-select" value={fromLang} onChange={e => setFromLang(e.target.value)}>
                      {TRANSLATE_LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                    </select>
                    <div className="tool-field-label">To</div>
                    <select className="tool-select" value={toLang} onChange={e => setToLang(e.target.value)}>
                      {TRANSLATE_LANGS.filter(l => l !== fromLang).map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                    </select>
                  </>
                )}

                {/* Natural language prompt */}
                {mode === 'generate' && (
                  <>
                    <div className="tool-field-label">Describe your circuit</div>
                    <textarea className="tool-code-input"
                      style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}
                      placeholder="e.g. Create a 3-qubit GHZ state&#10;e.g. Implement Grover's search for 2 qubits&#10;e.g. Quantum Fourier Transform on 4 qubits"
                      value={toolExtra}
                      onChange={e => setToolExtra(e.target.value)}
                      rows={5}
                    />
                  </>
                )}

                {/* Error input for debug */}
                {mode === 'debug' && (
                  <>
                    <div className="tool-field-label">Runtime error (optional)</div>
                    <input className="tool-text-input"
                      placeholder="Paste compiler/simulator error message"
                      value={toolExtra}
                      onChange={e => setToolExtra(e.target.value)}
                    />
                  </>
                )}

                {/* Hardware question */}
                {mode === 'hardware' && (
                  <>
                    <div className="tool-field-label">Question / requirements</div>
                    <textarea className="tool-code-input"
                      style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', minHeight: 80 }}
                      placeholder="e.g. Which IBM backend handles 5 qubits with low noise?&#10;e.g. Estimate fidelity for this circuit on ibm_osaka"
                      value={toolExtra}
                      onChange={e => setToolExtra(e.target.value)}
                      rows={3}
                    />
                  </>
                )}

                <button className="tool-run-btn" onClick={runTool} disabled={streaming}>
                  {streaming
                    ? <><div className="btn-spinner" style={{ borderColor: 'rgba(167,139,250,0.3)', borderTopColor: '#a78bfa' }} />Thinking…</>
                    : <><Icon d={Icons.zap} size={15} />Run {currentMode.label}</>
                  }
                </button>

                {editorCode && mode !== 'generate' && !toolCode && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Using editor code as input
                  </div>
                )}
              </div>

              {/* Output column */}
              <div className="tool-output-col">
                <div className="tool-output-header">
                  <span>Output</span>
                  {toolOutput && (
                    <button className="copy-btn" onClick={copyOutput}>
                      <Icon d={Icons.copy} size={11} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <div className="tool-output-content">
                  {toolOutput
                    ? <MdContent content={toolOutput} streaming={streaming} />
                    : <div className="tool-empty-state">
                        <Icon d={currentMode.icon} size={32} color="var(--border-bright)" />
                        <span>Results appear here</span>
                      </div>
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

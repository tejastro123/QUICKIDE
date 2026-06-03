import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import {
  Zap, ArrowRight, Code2, Eye, GitBranch, Layers,
  FlaskConical, Rocket, BookOpen,
  ChevronDown
} from 'lucide-react';

const GithubIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width={props.size || 16}
    height={props.size || 16}
    fill="currentColor"
    style={props.style}
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

/* ─── Scroll-reveal hook ─────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ─── Data ───────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Code2, color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
    title: 'QuCPL Compiler',
    desc: 'Write quantum circuits in QuCPL — a purpose-built language with syntax highlighting, autocompletion, and real-time error feedback.'
  },
  {
    icon: Eye, color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)',
    title: 'Circuit Visualization',
    desc: 'Instantly render publication-quality quantum circuit diagrams. Toggle debug mode to inspect gate-by-gate statevector evolution.'
  },
  {
    icon: Rocket, color: '#22d3ee',
    bg: 'rgba(34,211,238,0.10)',
    accent: 'linear-gradient(90deg,#22d3ee,#38bdf8)',
    title: 'IBM Cloud Execution',
    desc: 'Submit jobs directly to IBM Quantum hardware or simulators. Track job history and results from the built-in Cloud Dashboard.'
  },
  {
    icon: FlaskConical, color: '#34d399',
    bg: 'rgba(52,211,153,0.10)',
    accent: 'linear-gradient(90deg,#34d399,#10b981)',
    title: 'Quantum Debugger',
    desc: 'Step through quantum gates one at a time. Inspect amplitude probabilities and visualize how your statevector changes at each step.'
  },
  {
    icon: Layers, color: '#f472b6',
    bg: 'rgba(244,114,182,0.10)',
    accent: 'linear-gradient(90deg,#f472b6,#ec4899)',
    title: 'Circuit Optimizer',
    desc: 'AI-powered suggestions to reduce gate count and depth. Accept optimizations with one click and see the IR diff immediately.'
  },
  {
    icon: BookOpen, color: '#fbbf24',
    bg: 'rgba(251,191,36,0.10)',
    accent: 'linear-gradient(90deg,#fbbf24,#f59e0b)',
    title: 'Algorithm Library',
    desc: 'Browse 20+ quantum algorithms — Grover\'s search, Shor\'s factoring, QFT, VQE, and more. Load any into the editor instantly.'
  },
];

const STEPS = [
  { num: '1', title: 'Write QuCPL code', desc: 'Use the Monaco-powered editor with QuCPL syntax highlighting, autocomplete for gates, and built-in code snippets.' },
  { num: '2', title: 'Compile & Visualize', desc: 'Parse → Compile → Transpile pipeline generates AST, IR, QASM, and Qiskit Python — plus a live circuit diagram.' },
  { num: '3', title: 'Simulate or Run on Hardware', desc: 'Choose an ideal or noisy backend for simulation, or submit your circuit to real IBM Quantum hardware in one click.' },
];

/* ─── Component ──────────────────────────────────────────── */
export default function LandingPage() {
  useReveal();

  const featuresRef = useRef(null);
  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="landing">

      {/* ══════ HERO ══════ */}
      <section className="landing-hero">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="landing-hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Now with IBM Quantum Cloud Integration
          </div>

          <h1 className="hero-headline">
            Build Quantum Circuits<br />
            <span className="hero-headline-gradient">at the Speed of Thought</span>
          </h1>

          <p className="hero-subheadline">
            QuickIDE is the world's first IDE for the QuCPL quantum programming language.
            Write, compile, visualize, debug, and run circuits on real quantum hardware — all in one place.
          </p>

          <div className="hero-ctas">
            <Link to="/register" className="hero-cta-primary">
              <Zap size={18} />
              Get Started Free
              <ArrowRight size={16} />
            </Link>
            <button onClick={scrollToFeatures} className="hero-cta-secondary">
              See Features
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="hero-stats">
            {[
              { value: '20+', label: 'Quantum Algorithms' },
              { value: '7',   label: 'Gate Optimizations' },
              { value: '3',   label: 'IBM Backends' },
              { value: '1',   label: 'Custom Language' },
            ].map(s => (
              <div className="hero-stat" key={s.label}>
                <div className="hero-stat-value">{s.value}</div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CODE DEMO ══════ */}
      <section className="landing-demo">
        <h2 className="landing-section-title reveal">
          See QuCPL in <span style={{ background: 'linear-gradient(135deg,var(--quantum-blue),var(--quantum-purple))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Action</span>
        </h2>
        <p className="landing-section-sub reveal">
          A purpose-built language for quantum computing — readable, expressive, and powerful.
        </p>

        <div className="demo-window reveal">
          <div className="demo-window-header">
            <div className="demo-dot demo-dot-red"    />
            <div className="demo-dot demo-dot-yellow" />
            <div className="demo-dot demo-dot-green"  />
            <span className="demo-title">bell_state.qucpl — QuickIDE</span>
          </div>
          <div className="demo-body">
            <div className="demo-code">
              <div className="demo-label"><Code2 size={12} /> QuCPL Source</div>
              <pre><span className="code-cmt">// Bell State — Quantum Entanglement</span>{'\n'}
<span className="code-kw">qubit</span> <span className="code-var">q0</span>, <span className="code-var">q1</span>;{'\n'}
<span className="code-cmt">// Apply Hadamard to q0</span>{'\n'}
<span className="code-kw">qop</span> <span className="code-gate">h</span> <span className="code-var">q0</span>;{'\n'}
<span className="code-cmt">// Entangle with CNOT</span>{'\n'}
<span className="code-kw">qop</span> <span className="code-gate">cx</span> <span className="code-var">q0</span>, <span className="code-var">q1</span>;{'\n'}
{'\n'}
<span className="code-kw">measure</span> <span className="code-var">q0</span>, <span className="code-var">q1</span> <span className="code-op">-{'>'}</span> <span className="code-str">c0</span>, <span className="code-str">c1</span>;</pre>
            </div>
            <div className="demo-output">
              <div className="demo-label"><FlaskConical size={12} /> Compiled Output</div>
              <pre><span className="out-info">{'>'} Parsing AST...</span>{'\n'}
<span className="out-ok">✓ AST generated (2 qubits)</span>{'\n'}
{'\n'}
<span className="out-info">{'>'} Compiling to IR...</span>{'\n'}
<span className="out-ok">✓ 3 instructions</span>{'\n'}
{'\n'}
<span className="out-info">{'>'} Transpiling to Qiskit...</span>{'\n'}
<span className="out-ok">✓ QASM ready</span>{'\n'}
{'\n'}
<span className="out-info">{'>'} Simulating (ideal)...</span>{'\n'}
<span className="out-data">  |00⟩: 50.3%  ████████████</span>{'\n'}
<span className="out-data">  |11⟩: 49.7%  ████████████</span>{'\n'}
<span className="out-ok">✓ Entanglement confirmed</span></pre>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section className="landing-features" ref={featuresRef}>
        <h2 className="landing-section-title reveal">
          Everything you need to build<br />
          <span className="hero-headline-gradient">quantum software</span>
        </h2>
        <p className="landing-section-sub reveal">
          A complete quantum development environment from first principles to real hardware execution.
        </p>

        <div className="features-grid">
          {FEATURES.map((f, i) => {
            const FeatureIcon = f.icon; // Capital letter required for JSX component
            return (
              <div
                key={f.title}
                className="feature-card reveal"
                style={{ '--feature-accent': f.accent, transitionDelay: `${i * 0.08}s` }}
              >
                <div className="feature-icon-wrapper" style={{ background: f.bg }}>
                  <FeatureIcon size={24} color={f.color} />
                </div>
                <div className="feature-title">{f.title}</div>
                <p className="feature-desc">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="landing-hiw">
        <h2 className="landing-section-title reveal">
          How it <span className="hero-headline-gradient">works</span>
        </h2>
        <p className="landing-section-sub reveal">
          From code to quantum hardware in three simple steps.
        </p>

        <div className="hiw-steps">
          {STEPS.map((s, i) => (
            <div key={s.num} className="hiw-step reveal" style={{ transitionDelay: `${i * 0.15}s` }}>
              <div className="hiw-step-num">{s.num}</div>
              <div className="hiw-step-content">
                <div className="hiw-step-title">{s.title}</div>
                <p className="hiw-step-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ CTA BANNER ══════ */}
      <section className="landing-cta">
        <div className="cta-card reveal">
          <h2 className="cta-card-title">
            Ready to build your first<br />
            <span className="hero-headline-gradient">quantum circuit?</span>
          </h2>
          <p className="cta-card-sub">
            Join researchers and developers building the future of quantum computing with QuickIDE.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <Link to="/register" className="hero-cta-primary">
              <Rocket size={18} />
              Start for Free
            </Link>
            <Link to="/login" className="hero-cta-secondary">
              Sign In
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '32px 40px' }}>
        <div className="landing-footer">
          <div className="footer-brand">
            <Zap size={16} style={{ color: 'var(--quantum-cyan)' }} />
            QuickIDE
          </div>
          <div className="footer-copy">
            © 2026 QuickIDE · Built for Quantum Developers
          </div>
          <div className="footer-links">
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <GithubIcon size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              GitHub
            </a>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

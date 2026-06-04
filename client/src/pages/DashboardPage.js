import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import * as api from '../services/api';
import './DashboardPage.css';
import {
  Cpu, FolderOpen, Cloud, BrainCircuit, Zap, Activity,
  Clock, TrendingUp, Play, ArrowRight, Code2, Plus,
  CheckCircle, AlertCircle, Loader2, ChevronRight,
  GitBranch, Layers, FlaskConical, Rocket
} from 'lucide-react';

const ALGORITHMS = [
  { name: 'Bell State',       code: 'qubit q0, q1;\nqop h q0;\nqop cx q0, q1;\nmeasure q0, q1 -> c0, c1;', tag: 'Entanglement', color: '#3b82f6' },
  { name: 'GHZ State',        code: 'qubit q0, q1, q2;\nqop h q0;\nqop cx q0, q1;\nqop cx q1, q2;\nmeasure q0, q1, q2 -> c0, c1, c2;', tag: 'Multi-qubit', color: '#8b5cf6' },
  { name: 'Quantum Teleport', code: 'qubit q0, q1, q2;\nqop h q1;\nqop cx q1, q2;\nqop cx q0, q1;\nqop h q0;\nmeasure q0 -> c0;\nmeasure q1 -> c1;', tag: 'Protocol', color: '#22d3ee' },
  { name: 'Grover 2-qubit',   code: 'qubit q0, q1;\nqop h q0;\nqop h q1;\nqop cz q0, q1;\nqop h q0;\nqop h q1;\nqop x q0;\nqop x q1;\nqop cz q0, q1;\nqop x q0;\nqop x q1;\nqop h q0;\nqop h q1;\nmeasure q0, q1 -> c0, c1;', tag: 'Search', color: '#34d399' },
];

const STATUS_COLOR = { completed: '#34d399', queued: '#fbbf24', failed: '#f87171', running: '#22d3ee' };
const STATUS_ICON  = { completed: CheckCircle, queued: Clock, failed: AlertCircle, running: Loader2 };

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-icon" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={18} color={color} />
      </div>
      <div className="dash-stat-body">
        <div className="dash-stat-value">{value ?? '—'}</div>
        <div className="dash-stat-label">{label}</div>
        {sub && <div className="dash-stat-sub">{sub}</div>}
      </div>
      {trend && <div className="dash-stat-trend" style={{ color }}>{trend}</div>}
    </div>
  );
}

export default function DashboardPage({ onLoadProject }) {
  const { quota } = useContext(AuthContext);
  const navigate = useNavigate();

  const [projects, setProjects]   = useState([]);
  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [greeting, setGreeting]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, jRes] = await Promise.allSettled([api.getAllProjects(), api.getCloudJobs()]);
      if (pRes.status === 'fulfilled') setProjects(pRes.value.data || []);
      if (jRes.status === 'fulfilled') setJobs(jRes.value.data?.jobs || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, [load]);

  const recentProjects = [...projects].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 5);
  const recentJobs     = [...jobs].slice(0, 4);

  const completedJobs  = jobs.filter(j => j.status === 'completed').length;
  const simsUsed       = quota?.usage?.simulate  ?? '—';
  const simsLimit      = quota?.limits?.simulate === Infinity ? '∞' : (quota?.limits?.simulate ?? '—');
  const compilesUsed   = quota?.usage?.compile   ?? '—';

  const handleLoadAlgo = (code) => {
    onLoadProject?.(code);
    navigate('/');
  };

  const handleLoadProject = (code) => {
    onLoadProject?.(code);
    navigate('/');
  };

  return (
    <div className="dashboard">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-greeting">{greeting}</div>
          <h1 className="dash-title">
            Welcome back to <span className="dash-title-brand">QuickIDE</span>
          </h1>
          <p className="dash-subtitle">Your quantum computing workspace</p>
        </div>
        <div className="dash-header-actions">
          <Link to="/" className="dash-btn-primary">
            <Plus size={15} />
            New Circuit
          </Link>
          <Link to="/copilot" className="dash-btn-secondary">
            <BrainCircuit size={15} />
            Open QuAI
          </Link>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div className="dash-stats">
        <StatCard icon={FolderOpen}  label="Total Projects"    value={projects.length}  color="#3b82f6" sub={`${recentProjects.length} recently edited`} />
        <StatCard icon={FlaskConical} label="Simulations Used"  value={`${simsUsed} / ${simsLimit}`} color="#8b5cf6" sub={quota?.tier ? `${quota.tier} tier` : undefined} />
        <StatCard icon={Code2}        label="Compilations"      value={compilesUsed}     color="#22d3ee" sub="this session" />
        <StatCard icon={Cloud}        label="Cloud Jobs"         value={jobs.length}      color="#34d399" sub={`${completedJobs} completed`} />
        <StatCard icon={BrainCircuit} label="QuAI Copilot"      value="Active"           color="#a78bfa" sub="llama3 model" />
      </div>

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="dash-grid">

        {/* Recent Projects */}
        <div className="dash-card dash-card-projects">
          <div className="dash-card-header">
            <div className="dash-card-title"><FolderOpen size={15} /> Recent Projects</div>
            <Link to="/resources" className="dash-card-link">View all <ChevronRight size={13} /></Link>
          </div>
          <div className="dash-card-body">
            {loading ? (
              <div className="dash-empty"><Loader2 size={20} className="spin" /> Loading…</div>
            ) : recentProjects.length === 0 ? (
              <div className="dash-empty">
                <FolderOpen size={28} opacity={0.3} />
                <span>No projects yet</span>
                <Link to="/" className="dash-empty-cta">Create your first circuit</Link>
              </div>
            ) : (
              <ul className="dash-project-list">
                {recentProjects.map(p => (
                  <li key={p._id} className="dash-project-item"
                    onClick={() => handleLoadProject(p.code)}>
                    <div className="dash-project-icon"><Code2 size={14} color="#3b82f6" /></div>
                    <div className="dash-project-info">
                      <span className="dash-project-name">{p.name}</span>
                      <span className="dash-project-date">
                        {new Date(p.updatedAt || p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Play size={13} className="dash-project-play" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Quick Start — Algorithm Templates */}
        <div className="dash-card dash-card-algos">
          <div className="dash-card-header">
            <div className="dash-card-title"><Rocket size={15} /> Quick Start</div>
            <Link to="/resources" className="dash-card-link">Library <ChevronRight size={13} /></Link>
          </div>
          <div className="dash-card-body">
            <div className="dash-algo-grid">
              {ALGORITHMS.map(a => (
                <button key={a.name} className="dash-algo-btn"
                  onClick={() => handleLoadAlgo(a.code)}
                  style={{ '--algo-color': a.color }}>
                  <div className="dash-algo-tag" style={{ color: a.color, borderColor: `${a.color}40`, background: `${a.color}12` }}>{a.tag}</div>
                  <div className="dash-algo-name">{a.name}</div>
                  <ArrowRight size={13} className="dash-algo-arrow" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cloud Jobs */}
        <div className="dash-card dash-card-jobs">
          <div className="dash-card-header">
            <div className="dash-card-title"><Cloud size={15} /> Cloud Jobs</div>
            <Link to="/cloud" className="dash-card-link">View all <ChevronRight size={13} /></Link>
          </div>
          <div className="dash-card-body">
            {loading ? (
              <div className="dash-empty"><Loader2 size={20} className="spin" /> Loading…</div>
            ) : recentJobs.length === 0 ? (
              <div className="dash-empty">
                <Cloud size={28} opacity={0.3} />
                <span>No cloud jobs yet</span>
              </div>
            ) : (
              <ul className="dash-jobs-list">
                {recentJobs.map(j => {
                  const SIcon = STATUS_ICON[j.status] || Activity;
                  const sColor = STATUS_COLOR[j.status] || '#94a3b8';
                  return (
                    <li key={j._id} className="dash-job-item">
                      <SIcon size={14} color={sColor} className={j.status === 'running' ? 'spin' : ''} />
                      <div className="dash-job-info">
                        <span className="dash-job-name">{j.projectName || 'Unnamed Job'}</span>
                        <span className="dash-job-backend">{j.backend}</span>
                      </div>
                      <span className="dash-job-status" style={{ color: sColor, borderColor: `${sColor}40`, background: `${sColor}12` }}>
                        {j.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Quota usage */}
        <div className="dash-card dash-card-quota">
          <div className="dash-card-header">
            <div className="dash-card-title"><TrendingUp size={15} /> Usage</div>
            {quota?.tier && (
              <span className="dash-tier-badge" style={{
                color: quota.tier === 'free' ? 'var(--text-muted)' : 'var(--quantum-cyan)',
                borderColor: quota.tier === 'free' ? 'var(--border-color)' : 'rgba(34,211,238,0.3)',
                background: quota.tier === 'free' ? 'rgba(255,255,255,0.04)' : 'rgba(34,211,238,0.08)',
              }}>
                {quota.tier.toUpperCase()}
              </span>
            )}
          </div>
          <div className="dash-card-body">
            {quota ? (
              <div className="dash-quota-bars">
                {[
                  { label: 'Simulations', used: quota.usage.simulate, limit: quota.limits.simulate, color: '#8b5cf6' },
                  { label: 'Compilations', used: quota.usage.compile, limit: quota.limits.compile, color: '#3b82f6' },
                ].map(q => {
                  const pct = q.limit === Infinity ? 5 : Math.round((q.used / q.limit) * 100);
                  const warn = pct > 80;
                  return (
                    <div key={q.label} className="dash-quota-row">
                      <div className="dash-quota-labels">
                        <span className="dash-quota-name">{q.label}</span>
                        <span className="dash-quota-val">
                          {q.used} / {q.limit === Infinity ? '∞' : q.limit}
                        </span>
                      </div>
                      <div className="dash-quota-track">
                        <div className="dash-quota-fill" style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: warn ? 'linear-gradient(90deg,#f59e0b,#f87171)' : `linear-gradient(90deg,${q.color},${q.color}cc)`,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dash-empty"><Loader2 size={20} className="spin" /></div>
            )}
          </div>
        </div>

        {/* QuAI Copilot promo */}
        <div className="dash-card dash-card-ai">
          <div className="dash-ai-orb" />
          <div className="dash-ai-content">
            <div className="dash-ai-icon">
              <BrainCircuit size={28} color="white" />
            </div>
            <div className="dash-ai-title">QuAI Copilot</div>
            <p className="dash-ai-desc">
              Generate QuCPL circuits from plain English, debug gate errors, explain quantum algorithms, and translate between frameworks — all powered by local LLM.
            </p>
            <div className="dash-ai-chips">
              {['NL → QuCPL', 'Debug', 'Optimize', 'Explain'].map(c => (
                <span key={c} className="dash-ai-chip">{c}</span>
              ))}
            </div>
            <Link to="/copilot" className="dash-ai-btn">
              <Zap size={14} /> Open QuAI <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <div className="dash-card dash-card-shortcuts">
          <div className="dash-card-header">
            <div className="dash-card-title"><GitBranch size={15} /> Shortcuts</div>
          </div>
          <div className="dash-card-body">
            <ul className="dash-shortcuts-list">
              {[
                { keys: ['Ctrl', 'Enter'], desc: 'Compile & Simulate' },
                { keys: ['F5'],            desc: 'Run Simulation' },
                { keys: ['F9'],            desc: 'Toggle Debugger' },
                { keys: ['Ctrl', 'S'],     desc: 'Save Project' },
                { keys: ['Ctrl', '⇧', 'F'],desc: 'Format Code' },
              ].map(s => (
                <li key={s.desc} className="dash-shortcut-row">
                  <div className="dash-shortcut-keys">
                    {s.keys.map(k => <kbd key={k} className="dash-kbd">{k}</kbd>)}
                  </div>
                  <span className="dash-shortcut-desc">{s.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick links */}
        <div className="dash-card dash-card-links">
          <div className="dash-card-header">
            <div className="dash-card-title"><Layers size={15} /> Quick Links</div>
          </div>
          <div className="dash-card-body">
            <div className="dash-links-grid">
              {[
                { to: '/',         icon: Cpu,          label: 'IDE Editor',      color: '#3b82f6' },
                { to: '/resources',icon: FolderOpen,   label: 'Projects',        color: '#8b5cf6' },
                { to: '/cloud',    icon: Cloud,        label: 'Cloud Dashboard', color: '#22d3ee' },
                { to: '/copilot',  icon: BrainCircuit, label: 'QuAI Copilot',   color: '#a78bfa' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="dash-link-tile"
                  style={{ '--tile-color': l.color }}>
                  <l.icon size={20} color={l.color} />
                  <span>{l.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

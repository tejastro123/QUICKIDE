import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import * as api from '../services/api';
import './DashboardPage.css';
import {
  LayoutDashboard, FolderOpen, Cloud, BrainCircuit, Zap, Activity,
  Clock, TrendingUp, Play, ArrowRight, Code2, Plus, Settings,
  CheckCircle, AlertCircle, Loader2, ChevronRight, ChevronDown,
  GitBranch, Layers, FlaskConical, Rocket, BookOpen, Search,
  Cpu, Star, Command, X, Sparkles, BarChart3, Users, Bell,
  Terminal, Boxes, PanelLeftClose, PanelLeft, ExternalLink
} from 'lucide-react';

const ALGORITHMS = [
  { name: 'Bell State',     tag: 'Entanglement', color: '#3b82f6', desc: '2 qubits, H + CNOT', code: 'qubit q0, q1;\nqop h q0;\nqop cx q0, q1;\nmeasure q0, q1 -> c0, c1;' },
  { name: 'GHZ State',      tag: 'Multi-qubit',  color: '#8b5cf6', desc: '3 qubits, tripartite', code: 'qubit q0, q1, q2;\nqop h q0;\nqop cx q0, q1;\nqop cx q1, q2;\nmeasure q0, q1, q2 -> c0, c1, c2;' },
  { name: 'Teleportation',  tag: 'Protocol',      color: '#22d3ee', desc: 'Quantum state transfer', code: 'qubit q0, q1, q2;\nqop h q1;\nqop cx q1, q2;\nqop cx q0, q1;\nqop h q0;\nmeasure q0 -> c0;\nmeasure q1 -> c1;' },
  { name: "Grover's Search",tag: 'Algorithm',     color: '#34d399', desc: '2-qubit oracle search', code: 'qubit q0, q1;\nqop h q0;\nqop h q1;\nqop cz q0, q1;\nqop h q0;\nqop h q1;\nqop x q0;\nqop x q1;\nqop cz q0, q1;\nqop x q0;\nqop x q1;\nqop h q0;\nqop h q1;\nmeasure q0, q1 -> c0, c1;' },
  { name: 'QFT 2-qubit',    tag: 'Transform',     color: '#f472b6', desc: 'Fourier basis change', code: 'qubit q0, q1;\nqop h q0;\nqop rz(1.5708) q1;\nqop cx q0, q1;\nqop rz(-1.5708) q1;\nqop cx q0, q1;\nqop h q1;\nmeasure q0, q1 -> c0, c1;' },
  { name: 'Superposition',  tag: 'Basic',          color: '#fbbf24', desc: 'Equal superposition', code: 'qubit q0, q1, q2;\nqop h q0;\nqop h q1;\nqop h q2;\nmeasure q0, q1, q2 -> c0, c1, c2;' },
];

const STATUS_COLOR = { completed:'#34d399', queued:'#fbbf24', failed:'#f87171', running:'#22d3ee' };
const STATUS_ICON  = { completed: CheckCircle, queued: Clock, failed: AlertCircle, running: Loader2 };

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/' },
  { icon: Cpu,             label: 'IDE Editor', to: '/ide' },
  { icon: FolderOpen,      label: 'Projects',   to: '/resources' },
  { icon: Cloud,           label: 'Cloud Jobs', to: '/cloud' },
  { icon: BrainCircuit,    label: 'QuAI',       to: '/copilot' },
];

const QUICK_ACTIONS = [
  { icon: Plus,      label: 'New Circuit',      to: '/ide',      color: '#3b82f6' },
  { icon: BrainCircuit, label: 'Ask QuAI',      to: '/copilot',  color: '#8b5cf6' },
  { icon: Cloud,     label: 'View Jobs',        to: '/cloud',    color: '#22d3ee' },
  { icon: BookOpen,  label: 'Algorithm Library',to: '/resources',color: '#34d399' },
];

export default function DashboardPage({ onLoadProject }) {
  const { quota } = useContext(AuthContext);
  const navigate = useNavigate();

  const [projects, setProjects]     = useState([]);
  const [jobs, setJobs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen]  = useState(false);
  const [searchQ, setSearchQ]        = useState('');
  const [greeting, setGreeting]      = useState('');
  const [username, setUsername]      = useState('');
  const searchRef = useRef(null);

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
    // get username from localStorage token payload
    try {
      const t = localStorage.getItem('token');
      if (t) {
        const pay = JSON.parse(atob(t.split('.')[1]));
        setUsername(pay?.user?.email?.split('@')[0] || 'developer');
      }
    } catch (_) {}
  }, [load]);

  // Ctrl+K to open search
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(v => !v); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => { if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50); }, [searchOpen]);

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 6);

  const filteredProjects = searchQ
    ? projects.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase()))
    : [];

  const recentJobs     = jobs.slice(0, 5);
  const completedJobs  = jobs.filter(j => j.status === 'completed').length;
  const simsUsed       = quota?.usage?.simulate  ?? 0;
  const simsLimit      = quota?.limits?.simulate === Infinity ? Infinity : (quota?.limits?.simulate ?? 10);
  const compilesUsed   = quota?.usage?.compile   ?? 0;
  const compilesLimit  = quota?.limits?.compile  === Infinity ? Infinity : (quota?.limits?.compile ?? 50);

  const handleLoad = (code) => { onLoadProject?.(code); navigate('/ide'); };

  return (
    <div className={`dash-root${sidebarOpen ? '' : ' dash-root--collapsed'}`}>

      {/* ── Command palette ────────────────────────────────── */}
      {searchOpen && (
        <div className="dash-palette-overlay" onClick={() => setSearchOpen(false)}>
          <div className="dash-palette" onClick={e => e.stopPropagation()}>
            <div className="dash-palette-search">
              <Search size={16} color="var(--text-muted)" />
              <input ref={searchRef} className="dash-palette-input"
                placeholder="Search projects, algorithms…"
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              <kbd className="dash-kbd-small">ESC</kbd>
            </div>
            {searchQ && (
              <div className="dash-palette-results">
                {filteredProjects.length === 0
                  ? <div className="dash-palette-empty">No projects match "{searchQ}"</div>
                  : filteredProjects.slice(0, 6).map(p => (
                    <button key={p._id} className="dash-palette-item"
                      onClick={() => { handleLoad(p.code); setSearchOpen(false); }}>
                      <Code2 size={14} color="#3b82f6" />
                      <span>{p.name}</span>
                      <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                    </button>
                  ))
                }
              </div>
            )}
            {!searchQ && (
              <div className="dash-palette-results">
                <div className="dash-palette-section-label">Quick Actions</div>
                {QUICK_ACTIONS.map(q => (
                  <Link key={q.label} to={q.to} className="dash-palette-item"
                    onClick={() => setSearchOpen(false)}>
                    <q.icon size={14} color={q.color} />
                    <span>{q.label}</span>
                    <ArrowRight size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                  </Link>
                ))}
                <div className="dash-palette-section-label" style={{ marginTop: 8 }}>Algorithm Templates</div>
                {ALGORITHMS.slice(0, 4).map(a => (
                  <button key={a.name} className="dash-palette-item"
                    onClick={() => { handleLoad(a.code); setSearchOpen(false); }}>
                    <Zap size={14} color={a.color} />
                    <span>{a.name}</span>
                    <span style={{ marginLeft:'auto', fontSize:'0.68rem', color:'var(--text-muted)' }}>{a.tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-top">
          <div className="dash-sidebar-brand">
            <div className="dash-brand-icon"><Zap size={15} color="white" /></div>
            {sidebarOpen && <span className="dash-brand-name">QuickIDE</span>}
          </div>
          <button className="dash-sidebar-toggle" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        </div>

        {sidebarOpen && (
          <button className="dash-sidebar-search-btn" onClick={() => setSearchOpen(true)}>
            <Search size={13} /> Search…
            <span className="dash-sidebar-search-shortcut"><Command size={10} />K</span>
          </button>
        )}

        <nav className="dash-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `dash-nav-item${isActive ? ' active' : ''}`}>
              <item.icon size={17} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-bottom">
          <NavLink to="/settings" className="dash-nav-item">
            <Settings size={17} />
            {sidebarOpen && <span>Settings</span>}
          </NavLink>
          {sidebarOpen && quota && (
            <div className="dash-sidebar-quota">
              <div className="dash-sidebar-quota-label">
                <span>Simulations</span>
                <span>{simsUsed}/{simsLimit === Infinity ? '∞' : simsLimit}</span>
              </div>
              <div className="dash-sidebar-quota-bar">
                <div className="dash-sidebar-quota-fill" style={{
                  width: simsLimit === Infinity ? '5%' : `${Math.min((simsUsed/simsLimit)*100,100)}%`
                }} />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="dash-main">

        {/* Top bar */}
        <div className="dash-topbar">
          <div className="dash-topbar-left">
            <div className="dash-topbar-title">Dashboard</div>
          </div>
          <div className="dash-topbar-right">
            <button className="dash-topbar-search" onClick={() => setSearchOpen(true)}>
              <Search size={14} /> Search…
              <span className="dash-topbar-kbd"><Command size={10} />K</span>
            </button>
            <Link to="/ide" className="dash-topbar-btn dash-topbar-btn--primary">
              <Plus size={14} /> New Circuit
            </Link>
            <button className="dash-topbar-icon-btn"><Bell size={16} /></button>
          </div>
        </div>

        <div className="dash-content">

          {/* ── Welcome banner ─────────────────────────────── */}
          <div className="dash-welcome">
            <div className="dash-welcome-text">
              <div className="dash-welcome-greeting">{greeting}, {username} 👋</div>
              <p className="dash-welcome-sub">
                {recentProjects.length > 0
                  ? `You have ${projects.length} project${projects.length !== 1 ? 's' : ''}. ${completedJobs > 0 ? `${completedJobs} cloud jobs completed.` : ''}`
                  : 'Build your first quantum circuit and simulate it on real hardware.'}
              </p>
            </div>
            <div className="dash-welcome-actions">
              <Link to="/ide" className="dash-btn dash-btn--glow">
                <Zap size={14} /> Open IDE
              </Link>
              <Link to="/copilot" className="dash-btn dash-btn--ghost">
                <Sparkles size={14} /> Ask QuAI
              </Link>
            </div>
            <div className="dash-welcome-orbs">
              <div className="dash-welcome-orb dash-welcome-orb-1" />
              <div className="dash-welcome-orb dash-welcome-orb-2" />
            </div>
          </div>

          {/* ── Stats row ──────────────────────────────────── */}
          <div className="dash-stats-row">
            {[
              { icon: FolderOpen,  label: 'Projects',     value: projects.length, sub: `${recentProjects.length} recent`, color: '#3b82f6' },
              { icon: Cloud,       label: 'Cloud Jobs',   value: jobs.length,     sub: `${completedJobs} completed`,       color: '#22d3ee' },
              { icon: FlaskConical,label: 'Simulations',  value: simsUsed,        sub: quota?.tier || 'free tier',          color: '#8b5cf6' },
              { icon: BarChart3,   label: 'Compilations', value: compilesUsed,    sub: 'this session',                      color: '#34d399' },
            ].map(s => (
              <div key={s.label} className="dash-stat">
                <div className="dash-stat-icon-wrap" style={{ background:`${s.color}18`, border:`1px solid ${s.color}28` }}>
                  <s.icon size={16} color={s.color} />
                </div>
                <div>
                  <div className="dash-stat-val">{s.value ?? '—'}</div>
                  <div className="dash-stat-lbl">{s.label}</div>
                  {s.sub && <div className="dash-stat-sub">{s.sub}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* ── Two-column layout ──────────────────────────── */}
          <div className="dash-two-col">

            {/* Left column */}
            <div className="dash-col-left">

              {/* Recent projects */}
              <div className="dash-section">
                <div className="dash-section-hd">
                  <span><FolderOpen size={14} /> Recent Projects</span>
                  <Link to="/resources" className="dash-section-link">View all <ChevronRight size={12} /></Link>
                </div>
                {loading ? (
                  <div className="dash-skeleton-list">
                    {[1,2,3].map(i => <div key={i} className="dash-skeleton-row" />)}
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div className="dash-empty-state">
                    <Rocket size={32} opacity={0.25} />
                    <strong>No projects yet</strong>
                    <span>Start your first quantum circuit 🚀</span>
                    <Link to="/" className="dash-empty-cta"><Plus size={13} /> New Circuit</Link>
                  </div>
                ) : (
                  <div className="dash-project-grid">
                    {recentProjects.map(p => (
                      <button key={p._id} className="dash-project-card"
                        onClick={() => handleLoad(p.code)}>
                        <div className="dash-project-card-top">
                          <div className="dash-project-card-icon"><Code2 size={16} color="#3b82f6" /></div>
                          <span className="dash-project-card-name">{p.name}</span>
                        </div>
                        <div className="dash-project-card-meta">
                          <span><Clock size={11} /> {new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</span>
                          <span className="dash-project-card-open"><Play size={11} /> Open</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Algorithm templates */}
              <div className="dash-section">
                <div className="dash-section-hd">
                  <span><Rocket size={14} /> Algorithm Templates</span>
                  <Link to="/resources" className="dash-section-link">Library <ChevronRight size={12} /></Link>
                </div>
                <div className="dash-algo-list">
                  {ALGORITHMS.map(a => (
                    <button key={a.name} className="dash-algo-row"
                      onClick={() => handleLoad(a.code)}
                      style={{ '--ac': a.color }}>
                      <div className="dash-algo-dot" style={{ background: a.color }} />
                      <div className="dash-algo-info">
                        <span className="dash-algo-name">{a.name}</span>
                        <span className="dash-algo-desc">{a.desc}</span>
                      </div>
                      <span className="dash-algo-tag" style={{ color: a.color, borderColor:`${a.color}40`, background:`${a.color}10` }}>{a.tag}</span>
                      <ChevronRight size={13} className="dash-algo-chevron" />
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Right column */}
            <div className="dash-col-right">

              {/* QuAI promo */}
              <div className="dash-ai-card">
                <div className="dash-ai-glow" />
                <div className="dash-ai-badge"><Sparkles size={11} /> AI Powered</div>
                <div className="dash-ai-icon-wrap">
                  <BrainCircuit size={24} color="white" />
                </div>
                <div className="dash-ai-title">QuAI Copilot</div>
                <p className="dash-ai-body">Generate QuCPL circuits, debug gates, explain quantum mechanics, and translate between frameworks.</p>
                <div className="dash-ai-chips">
                  {['NL → QuCPL','Debug','Optimize','Translate'].map(c => (
                    <span key={c} className="dash-ai-chip">{c}</span>
                  ))}
                </div>
                <Link to="/copilot" className="dash-ai-cta">
                  Open QuAI <ArrowRight size={13} />
                </Link>
              </div>

              {/* Cloud jobs */}
              <div className="dash-section">
                <div className="dash-section-hd">
                  <span><Cloud size={14} /> Cloud Jobs</span>
                  <Link to="/cloud" className="dash-section-link">View all <ChevronRight size={12} /></Link>
                </div>
                {loading ? (
                  <div className="dash-skeleton-list">
                    {[1,2].map(i => <div key={i} className="dash-skeleton-row" />)}
                  </div>
                ) : recentJobs.length === 0 ? (
                  <div className="dash-empty-state" style={{ padding: '20px' }}>
                    <Cloud size={24} opacity={0.25} />
                    <span>No cloud jobs yet</span>
                    <Link to="/" className="dash-empty-cta"><Zap size={12} /> Run Circuit</Link>
                  </div>
                ) : (
                  <ul className="dash-jobs-list">
                    {recentJobs.map(j => {
                      const SI = STATUS_ICON[j.status] || Activity;
                      const sc = STATUS_COLOR[j.status] || '#94a3b8';
                      return (
                        <li key={j._id} className="dash-job-row">
                          <SI size={13} color={sc} className={j.status === 'running' ? 'spin' : ''} />
                          <div className="dash-job-info">
                            <span className="dash-job-name">{j.projectName || 'Unnamed'}</span>
                            <span className="dash-job-backend">{j.backend}</span>
                          </div>
                          <span className="dash-job-badge" style={{ color:sc, borderColor:`${sc}35`, background:`${sc}12` }}>
                            {j.status}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Usage quota */}
              <div className="dash-section">
                <div className="dash-section-hd">
                  <span><TrendingUp size={14} /> Usage</span>
                  {quota?.tier && (
                    <span className="dash-tier-pill" style={{
                      color: quota.tier === 'free' ? 'var(--text-muted)' : '#22d3ee',
                      borderColor: quota.tier === 'free' ? 'var(--border-color)' : 'rgba(34,211,238,0.3)',
                      background: quota.tier === 'free' ? 'rgba(255,255,255,0.04)' : 'rgba(34,211,238,0.08)',
                    }}>{quota.tier.toUpperCase()}</span>
                  )}
                </div>
                {quota ? (
                  <div className="dash-quota-section">
                    {[
                      { label:'Simulations',  used: simsUsed,     limit: simsLimit,    color:'#8b5cf6' },
                      { label:'Compilations', used: compilesUsed, limit: compilesLimit, color:'#3b82f6' },
                    ].map(q => {
                      const pct = q.limit === Infinity ? 4 : Math.min(Math.round((q.used/q.limit)*100),100);
                      const warn = pct > 80;
                      return (
                        <div key={q.label} className="dash-quota-row">
                          <div className="dash-quota-meta">
                            <span className="dash-quota-lbl">{q.label}</span>
                            <span className="dash-quota-val">{q.used} / {q.limit === Infinity ? '∞' : q.limit}</span>
                          </div>
                          <div className="dash-quota-track">
                            <div className="dash-quota-fill" style={{
                              width:`${pct}%`,
                              background: warn
                                ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                                : `linear-gradient(90deg,${q.color},${q.color}aa)`
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="dash-empty-state" style={{padding:'16px'}}><Loader2 size={18} className="spin" /></div>}
              </div>

              {/* Shortcuts */}
              <div className="dash-section">
                <div className="dash-section-hd"><span><Command size={14} /> Shortcuts</span></div>
                <ul className="dash-shortcuts">
                  {[
                    { keys:['Ctrl','Enter'], desc:'Compile & Simulate' },
                    { keys:['F5'],           desc:'Run Simulation'     },
                    { keys:['F9'],           desc:'Toggle Debugger'    },
                    { keys:['Ctrl','S'],     desc:'Save Project'       },
                    { keys:['Ctrl','K'],     desc:'Search / Palette'   },
                  ].map(s => (
                    <li key={s.desc} className="dash-shortcut-row">
                      <div className="dash-shortcut-keys">{s.keys.map(k => <kbd key={k} className="dash-kbd">{k}</kbd>)}</div>
                      <span className="dash-shortcut-desc">{s.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

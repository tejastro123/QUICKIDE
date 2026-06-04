import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as api from '../services/api';
import './ProfilePage.css';
import {
  User, FolderOpen, Cloud, BrainCircuit, Star, Settings, Award, Code2,
  Calendar, MapPin, Link as LinkIcon,
  Activity, CheckCircle, Clock, Zap, Plus, ArrowRight, Play, Copy,
  Check, Lock, Edit2, ShieldAlert, Cpu, Loader2
} from 'lucide-react';

function Avatar({ email, size = 100 }) {
  const initials = email ? email.slice(0, 2).toUpperCase() : '??';
  const colors = ['#3b82f6', '#8b5cf6', '#22d3ee', '#34d399', '#f472b6', '#fbbf24'];
  const color = colors[(email?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="profile-avatar" style={{
      width: size, height: size,
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      fontSize: size * 0.35 + 'px',
      boxShadow: `0 0 24px ${color}60`
    }}>
      {initials}
    </div>
  );
}

const Github = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const Twitter = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  </svg>
);

const Linkedin = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" strokeLinecap="round" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function ProfilePage({ onLoadProject, defaultTab }) {
  const { quota, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(defaultTab || 'overview');
  const [projects, setProjects] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('Quantum Software Engineer. Building circuits on the edge of reality.');
  const [location, setLocation] = useState('Silicon Valley, CA');
  const [website, setWebsite] = useState('https://quickide.dev');
  const [joinedDate, setJoinedDate] = useState('June 2026');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState('');
  const [tempLocation, setTempLocation] = useState('');
  const [tempWebsite, setTempWebsite] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // IBM token settings state
  const [ibmToken, setIbmToken] = useState('');
  const [ibmTokenLoading, setIbmTokenLoading] = useState(false);
  const [ibmTokenSuccess, setIbmTokenSuccess] = useState(false);

  // Load projects and jobs
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, jRes] = await Promise.allSettled([api.getAllProjects(), api.getCloudJobs()]);
      if (pRes.status === 'fulfilled') setProjects(pRes.value.data || []);
      if (jRes.status === 'fulfilled') setJobs(jRes.value.data?.jobs || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    loadData();
    try {
      const t = localStorage.getItem('token');
      if (t) {
        const pay = JSON.parse(atob(t.split('.')[1]));
        setEmail(pay?.user?.email || '');
        setUsername(pay?.user?.email?.split('@')[0] || 'developer');
        
        // decode jwt creation time for join date
        if (pay?.iat) {
          const date = new Date(pay.iat * 1000);
          setJoinedDate(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        }
      }
    } catch (_) {}

    // Load IBM Token
    const loadIbmToken = async () => {
      try {
        const res = await api.getIbmToken();
        if (res.data && res.data.ibmToken) {
          setIbmToken(res.data.ibmToken);
        }
      } catch (_) {}
    };
    loadIbmToken();
  }, [loadData]);

  const handleLoad = (code) => {
    onLoadProject?.(code);
    navigate('/ide');
  };

  const copySnippet = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditSave = () => {
    setBio(tempBio);
    setLocation(tempLocation);
    setWebsite(tempWebsite);
    setIsEditingBio(false);
  };

  const handleStartEdit = () => {
    setTempBio(bio);
    setTempLocation(location);
    setTempWebsite(website);
    setIsEditingBio(true);
  };

  const handleSaveIbmToken = async () => {
    setIbmTokenLoading(true);
    setIbmTokenSuccess(false);
    try {
      await api.updateIbmToken(ibmToken);
      setIbmTokenSuccess(true);
      setTimeout(() => setIbmTokenSuccess(false), 3000);
    } catch (_) {}
    setIbmTokenLoading(false);
  };

  // Mock Snippets
  const snippets = [
    {
      id: 'sn1',
      title: 'Hadamard Superposition',
      desc: 'Put a single qubit into a 50/50 superposition state.',
      code: 'qubit q0;\nqop h q0;\nmeasure q0 -> c0;'
    },
    {
      id: 'sn2',
      title: 'CNOT Entanglement',
      desc: 'Entangle target qubit based on control qubit state.',
      code: 'qubit q0, q1;\nqop h q0;\nqop cx q0, q1;\nmeasure q0, q1 -> c0, c1;'
    },
    {
      id: 'sn3',
      title: 'Bell State (Psi-plus)',
      desc: 'Prepare the entangled psi-plus state.',
      code: 'qubit q0, q1;\nqop x q0;\nqop h q0;\nqop cx q0, q1;\nmeasure q0, q1 -> c0, c1;'
    }
  ];

  // Mock Achievements
  const achievements = [
    { title: 'First Qubit', desc: 'Created your first project in QuickIDE', icon: Zap, unlocked: true, date: 'June 4, 2026', color: '#fbbf24' },
    { title: 'Spooky Entanglement', desc: 'Created a Bell State circuit', icon: Star, unlocked: true, date: 'June 4, 2026', color: '#8b5cf6' },
    { title: 'Cloud Runner', desc: 'Successfully ran a circuit on IBM Quantum hardware', icon: Cloud, unlocked: jobs.length > 0, date: jobs.length > 0 ? 'June 4, 2026' : null, color: '#32d3ee' },
    { title: 'AI Quantum Master', desc: 'Asked QuAI Copilot for advice 10 times', icon: BrainCircuit, unlocked: false, color: '#34d399' },
    { title: 'Optimal Circuitry', desc: 'Reduced circuit depth by 50% using optimization', icon: Award, unlocked: false, color: '#f472b6' }
  ];

  // GitHub contribution grid mock
  const contributionWeeks = Array.from({ length: 24 }, (_, w) => 
    Array.from({ length: 7 }, (_, d) => {
      const val = Math.floor(Math.random() * 5); // 0 to 4 levels of green
      return val;
    })
  );

  return (
    <div className="profile-container">
      {/* ── Cover Banner ── */}
      <div className="profile-cover">
        <div className="profile-cover-gradient" />
        <div className="profile-cover-mesh" />
      </div>

      <div className="profile-wrapper">
        {/* ── Main Layout ── */}
        <div className="profile-sidebar-layout">
          
          {/* ── LEFT COLUMN: User Bio & Socials ── */}
          <div className="profile-left-col">
            <div className="profile-card profile-user-info-card">
              <div className="profile-avatar-wrap">
                <Avatar email={email} size={110} />
              </div>

              <div className="profile-user-names">
                <h2>{username}</h2>
                <span className="profile-user-handle">@{username}</span>
                {quota?.tier && (
                  <span className="profile-pro-badge" style={{
                    background: quota.tier === 'pro' ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.06)',
                    color: quota.tier === 'pro' ? '#22d3ee' : 'var(--text-muted)',
                    borderColor: quota.tier === 'pro' ? 'rgba(34,211,238,0.3)' : 'var(--border-color)'
                  }}>
                    {quota.tier.toUpperCase()}
                  </span>
                )}
              </div>

              {isEditingBio ? (
                <div className="profile-bio-edit">
                  <textarea 
                    value={tempBio} 
                    onChange={e => setTempBio(e.target.value)}
                    maxLength={150} 
                    className="profile-input" 
                    placeholder="Tell us about yourself..."
                  />
                  <div className="profile-bio-edit-row">
                    <input 
                      type="text" 
                      value={tempLocation} 
                      onChange={e => setTempLocation(e.target.value)}
                      className="profile-input profile-input-small" 
                      placeholder="Location"
                    />
                    <input 
                      type="text" 
                      value={tempWebsite} 
                      onChange={e => setTempWebsite(e.target.value)}
                      className="profile-input profile-input-small" 
                      placeholder="Website"
                    />
                  </div>
                  <div className="profile-bio-actions">
                    <button className="profile-btn profile-btn-primary" onClick={handleEditSave}>Save</button>
                    <button className="profile-btn profile-btn-ghost" onClick={() => setIsEditingBio(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="profile-bio-text">{bio}</p>
                  <button className="profile-edit-btn" onClick={handleStartEdit}>
                    <Edit2 size={12} /> Edit Profile
                  </button>
                </>
              )}

              <div className="profile-meta-details">
                <div className="profile-meta-item">
                  <Calendar size={13} />
                  <span>Joined {joinedDate}</span>
                </div>
                {location && (
                  <div className="profile-meta-item">
                    <MapPin size={13} />
                    <span>{location}</span>
                  </div>
                )}
                {website && (
                  <div className="profile-meta-item">
                    <LinkIcon size={13} />
                    <a href={website} target="_blank" rel="noreferrer">{website.replace('https://', '')}</a>
                  </div>
                )}
              </div>

              <div className="profile-social-row">
                <a href="https://github.com" className="profile-social-icon"><Github size={15} /></a>
                <a href="https://twitter.com" className="profile-social-icon"><Twitter size={15} /></a>
                <a href="https://linkedin.com" className="profile-social-icon"><Linkedin size={15} /></a>
              </div>

              <div className="profile-followers-row">
                <span><strong>12</strong> Followers</span>
                <span className="profile-followers-dot" />
                <span><strong>48</strong> Following</span>
              </div>
            </div>

            {/* Quick Stats Widget */}
            <div className="profile-card profile-mini-stats-card">
              <div className="profile-mini-stats-header">SYSTEM USAGE</div>
              <div className="profile-mini-stat-item">
                <div className="stat-lbl">Tier Status</div>
                <div className="stat-val" style={{ color: '#22d3ee' }}>{quota?.tier?.toUpperCase() || 'FREE'}</div>
              </div>
              <div className="profile-mini-stat-item">
                <div className="stat-lbl">Simulations</div>
                <div className="stat-val">{quota?.usage?.simulate || 0} / {quota?.limits?.simulate === Infinity ? '∞' : quota?.limits?.simulate || 10}</div>
              </div>
              <div className="profile-mini-stat-item">
                <div className="stat-lbl">Compilations</div>
                <div className="stat-val">{quota?.usage?.compile || 0} / {quota?.limits?.compile === Infinity ? '∞' : quota?.limits?.compile || 50}</div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Content Tabs & Details ── */}
          <div className="profile-right-col">
            
            {/* ── Tab Navigation ── */}
            <div className="profile-tabs-header">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'projects', label: 'Projects', icon: FolderOpen, count: projects.length },
                { id: 'snippets', label: 'Snippets', icon: Code2, count: snippets.length },
                { id: 'achievements', label: 'Achievements', icon: Award, count: achievements.filter(a => a.unlocked).length },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`profile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon size={14} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && <span className="profile-tab-count">{tab.count}</span>}
                </button>
              ))}
            </div>

            {/* ── TAB CONTENT: OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="profile-tab-pane">
                
                {/* ── GitHub-like Contribution Calendar ── */}
                <div className="profile-card profile-calendar-card">
                  <div className="profile-calendar-header">
                    <span>Quantum Activity Grid</span>
                    <span className="profile-calendar-sub">Daily compilations & simulation actions</span>
                  </div>
                  <div className="profile-grid-wrapper">
                    <div className="profile-contribution-grid">
                      {contributionWeeks.map((week, wIdx) => (
                        <div key={wIdx} className="profile-grid-column">
                          {week.map((level, dIdx) => (
                            <div
                              key={dIdx}
                              className={`profile-grid-cell level-${level}`}
                              title={`Activity level: ${level}`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="profile-calendar-legend">
                    <span>Less</span>
                    <div className="profile-grid-cell level-0" />
                    <div className="profile-grid-cell level-1" />
                    <div className="profile-grid-cell level-2" />
                    <div className="profile-grid-cell level-3" />
                    <div className="profile-grid-cell level-4" />
                    <span>More</span>
                  </div>
                </div>

                {/* ── Key Performance Indicators / Top Stats ── */}
                <div className="profile-stats-grid">
                  <div className="profile-stat-box">
                    <span className="stat-lbl">Active Streak</span>
                    <h3 className="stat-val" style={{ color: '#fbbf24' }}>
                      <Zap size={18} fill="#fbbf24" style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                      4 Days
                    </h3>
                    <p className="stat-desc">Keep creating circuits to maintain</p>
                  </div>
                  <div className="profile-stat-box">
                    <span className="stat-lbl">Total Workspaces</span>
                    <h3 className="stat-val" style={{ color: '#3b82f6' }}>{projects.length}</h3>
                    <p className="stat-desc">Public & private files saved</p>
                  </div>
                  <div className="profile-stat-box">
                    <span className="stat-lbl">Cloud Hardware Runs</span>
                    <h3 className="stat-val" style={{ color: '#22d3ee' }}>{jobs.length}</h3>
                    <p className="stat-desc">IBM Quantum backend executions</p>
                  </div>
                </div>

                {/* ── Recent Activity Timeline ── */}
                <div className="profile-card profile-timeline-card">
                  <div className="profile-card-header-simple">RECENT LOGS</div>
                  <div className="profile-timeline">
                    {loading ? (
                      <div className="profile-timeline-loading"><Loader2 size={16} className="spin" /> Loading logs...</div>
                    ) : projects.length === 0 && jobs.length === 0 ? (
                      <div className="profile-timeline-empty">No activity logs recorded.</div>
                    ) : (
                      <>
                        {projects.slice(0, 3).map((p, idx) => (
                          <div key={p._id || idx} className="profile-timeline-item">
                            <div className="timeline-icon-wrap" style={{ background: 'rgba(59,130,246,0.1)' }}>
                              <Code2 size={13} color="#3b82f6" />
                            </div>
                            <div className="timeline-body">
                              <span className="timeline-action">Saved project <strong>{p.name}</strong></span>
                              <span className="timeline-time">{new Date(p.updatedAt || p.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                        {jobs.slice(0, 2).map((j, idx) => (
                          <div key={j._id || idx} className="profile-timeline-item">
                            <div className="timeline-icon-wrap" style={{ background: j.status === 'completed' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)' }}>
                              {j.status === 'completed' ? <CheckCircle size={13} color="#34d399" /> : <Clock size={13} color="#fbbf24" />}
                            </div>
                            <div className="timeline-body">
                              <span className="timeline-action">Submitted cloud job to <strong>{j.backend}</strong> (status: {j.status})</span>
                              <span className="timeline-time">{new Date(j.createdAt || Date.now()).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB CONTENT: PROJECTS ── */}
            {activeTab === 'projects' && (
              <div className="profile-tab-pane">
                <div className="profile-projects-grid">
                  {loading ? (
                    <div className="profile-loading-box"><Loader2 size={24} className="spin" /> Loading projects...</div>
                  ) : projects.length === 0 ? (
                    <div className="profile-empty-tab-state">
                      <FolderOpen size={36} opacity={0.25} />
                      <h3>No Projects Found</h3>
                      <p>Get started by writing a quantum circuit in the IDE editor.</p>
                      <Link to="/" className="profile-tab-cta-btn"><Plus size={14} /> New Circuit</Link>
                    </div>
                  ) : (
                    projects.map(p => (
                      <div key={p._id} className="profile-project-card">
                        <div className="project-card-top">
                          <div className="project-card-icon-wrap">
                            <Code2 size={16} color="#3b82f6" />
                          </div>
                          <div className="project-card-info">
                            <h4>{p.name}</h4>
                            <span className="project-card-time">Updated {new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <p className="project-card-desc">
                          {p.code ? p.code.substring(0, 60) + (p.code.length > 60 ? '...' : '') : 'Empty QuCPL quantum circuit'}
                        </p>
                        <div className="project-card-actions">
                          <button className="project-load-btn" onClick={() => handleLoad(p.code)}>
                            <Play size={12} />
                            <span>Load in IDE</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── TAB CONTENT: SNIPPETS ── */}
            {activeTab === 'snippets' && (
              <div className="profile-tab-pane">
                <div className="profile-snippets-list">
                  {snippets.map(sn => (
                    <div key={sn.id} className="profile-snippet-row">
                      <div className="snippet-header">
                        <div>
                          <h5>{sn.title}</h5>
                          <p>{sn.desc}</p>
                        </div>
                        <button className="snippet-copy-btn" onClick={() => copySnippet(sn.code, sn.id)}>
                          {copiedId === sn.id ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                          <span>{copiedId === sn.id ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="snippet-code-box">
                        <code>{sn.code}</code>
                      </pre>
                      <div className="snippet-actions">
                        <button className="snippet-load-btn" onClick={() => handleLoad(sn.code)}>
                          <Play size={10} /> Load template
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB CONTENT: ACHIEVEMENTS ── */}
            {activeTab === 'achievements' && (
              <div className="profile-tab-pane">
                <div className="profile-achievements-grid">
                  {achievements.map(ach => {
                    const AIcon = ach.icon;
                    return (
                      <div key={ach.title} className={`profile-achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`}>
                        <div className="achievement-icon-wrapper" style={{
                          background: ach.unlocked ? `${ach.color}15` : 'rgba(255,255,255,0.02)',
                          border: ach.unlocked ? `1px solid ${ach.color}35` : '1px solid var(--border-color)',
                          color: ach.unlocked ? ach.color : 'var(--text-muted)'
                        }}>
                          {ach.unlocked ? <AIcon size={24} /> : <Lock size={20} />}
                        </div>
                        <div className="achievement-details">
                          <h4>{ach.title}</h4>
                          <p>{ach.desc}</p>
                          {ach.unlocked && ach.date && (
                            <span className="achievement-unlocked-date">Unlocked {ach.date}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB CONTENT: SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="profile-tab-pane">
                {/* IBM Token Integration */}
                <div className="profile-card profile-settings-card">
                  <div className="profile-settings-header-icon">
                    <Cpu size={20} color="#22d3ee" />
                    <div>
                      <h5>IBM Quantum Integration</h5>
                      <p>Connect your account to real quantum hardware backends</p>
                    </div>
                  </div>
                  <div className="profile-settings-body">
                    <div className="profile-settings-field">
                      <label>IBM API Token</label>
                      <div className="profile-settings-input-group">
                        <input
                          type="password"
                          value={ibmToken}
                          onChange={e => setIbmToken(e.target.value)}
                          placeholder="Paste your IBM Quantum API Token here..."
                          className="profile-input"
                        />
                        <button
                          className="profile-btn profile-btn-primary"
                          onClick={handleSaveIbmToken}
                          disabled={ibmTokenLoading}
                        >
                          {ibmTokenLoading ? <Loader2 size={13} className="spin" /> : 'Save Token'}
                        </button>
                      </div>
                      {ibmTokenSuccess && (
                        <p className="profile-settings-success-msg">
                          <Check size={12} /> IBM API Token updated successfully!
                        </p>
                      )}
                      <p className="profile-settings-tip">
                        You can obtain your token from the <a href="https://quantum.ibm.com/" target="_blank" rel="noreferrer">IBM Quantum Console</a>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Appearance Settings */}
                <div className="profile-card profile-settings-card">
                  <div className="profile-settings-header-icon">
                    <Zap size={20} color="#fbbf24" />
                    <div>
                      <h5>Workspace Preferences</h5>
                      <p>Customize your look, theme, and code styling rules</p>
                    </div>
                  </div>
                  <div className="profile-settings-body">
                    <div className="profile-settings-toggle-row">
                      <div>
                        <h6>Dark Mode Appearance</h6>
                        <p>Toggle high-contrast premium developer dark mode theme</p>
                      </div>
                      <button 
                        className={`profile-toggle-switch ${theme === 'dark' ? 'active' : ''}`}
                        onClick={toggleTheme}
                      >
                        <div className="toggle-switch-handle" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal Information settings */}
                <div className="profile-card profile-settings-card">
                  <div className="profile-settings-header-icon">
                    <User size={20} color="#3b82f6" />
                    <div>
                      <h5>Profile Details</h5>
                      <p>Update your public facing engineer biography card information</p>
                    </div>
                  </div>
                  <div className="profile-settings-body profile-settings-form-grid">
                    <div className="profile-settings-field">
                      <label>Full Bio / Pitch</label>
                      <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        className="profile-input"
                        maxLength={150}
                        placeholder="Tell the community about your quantum goals..."
                      />
                    </div>
                    <div className="profile-settings-row-2col">
                      <div className="profile-settings-field">
                        <label>Location</label>
                        <input
                          type="text"
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          className="profile-input"
                          placeholder="e.g. Silicon Valley, CA"
                        />
                      </div>
                      <div className="profile-settings-field">
                        <label>Website Portfolio</label>
                        <input
                          type="text"
                          value={website}
                          onChange={e => setWebsite(e.target.value)}
                          className="profile-input"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account & Session Controls */}
                <div className="profile-card profile-settings-card" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
                  <div className="profile-settings-header-icon">
                    <ShieldAlert size={20} color="#f87171" />
                    <div>
                      <h5>Danger Zone</h5>
                      <p>Manage session states, tokens, or delete workspace data</p>
                    </div>
                  </div>
                  <div className="profile-settings-danger-actions">
                    <button className="profile-btn profile-btn-ghost" onClick={() => {
                      localStorage.removeItem('token');
                      logout();
                      navigate('/login');
                    }}>
                      Log Out Session
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

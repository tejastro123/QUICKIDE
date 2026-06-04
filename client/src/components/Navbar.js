import React, { useContext, useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import {
  Cpu, FolderOpen, Cloud, Sun, Moon, LogOut, Zap,
  BrainCircuit, LayoutDashboard, User, Settings, ChevronDown,
  CreditCard, Keyboard, Star
} from 'lucide-react';

function Avatar({ email, size = 30 }) {
  const initials = email ? email.slice(0, 2).toUpperCase() : '??';
  const colors = ['#3b82f6','#8b5cf6','#22d3ee','#34d399','#f472b6','#fbbf24'];
  const color = colors[(email?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33 + 'px', fontWeight: 700, color: 'white',
      flexShrink: 0, border: '2px solid rgba(255,255,255,0.12)',
      boxShadow: `0 0 12px ${color}50`,
      fontFamily: 'Inter, sans-serif',
    }}>
      {initials}
    </div>
  );
}

function Navbar() {
  const { isAuthenticated, logout, quota } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  // get email from token
  const [email, setEmail] = useState('');
  useEffect(() => {
    try {
      const t = localStorage.getItem('token');
      if (t) {
        const pay = JSON.parse(atob(t.split('.')[1]));
        // email stored in AuthContext via login — fall back to ID
        setEmail(pay?.user?.email || '');
      }
    } catch (_) {}
  }, [isAuthenticated]);

  // close dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); setDropOpen(false); };

  const username = email ? email.split('@')[0] : 'developer';

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        <NavLink to="/" style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <Zap size={18} style={{ color:'var(--quantum-cyan)', flexShrink:0, filter:'drop-shadow(0 0 6px var(--quantum-cyan))' }} />
          QuickIDE
        </NavLink>
      </div>

      {/* Center */}
      <div className="navbar-center" style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        {isAuthenticated && (
          <div style={{ display:'flex', alignItems:'center', gap:'7px', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:'var(--radius-pill)', padding:'4px 12px', fontSize:'0.72rem', fontWeight:'600', color:'var(--quantum-green)', letterSpacing:'0.04em' }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--quantum-green)', boxShadow:'0 0 6px var(--quantum-green)', animation:'pulseGlow 2s ease-in-out infinite' }} />
            CONNECTED
          </div>
        )}
        {isAuthenticated && quota && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-pill)', padding:'4px 12px', fontSize:'0.72rem', fontWeight:'500', color:'var(--text-secondary)' }}>
            <span style={{ textTransform:'uppercase', color: quota.tier==='free'?'var(--text-secondary)':'var(--quantum-cyan)', fontWeight:'700', fontSize:'0.68rem', background: quota.tier==='free'?'rgba(255,255,255,0.06)':'rgba(59,130,246,0.1)', padding:'2px 6px', borderRadius:'4px', border: quota.tier==='free'?'1px solid rgba(255,255,255,0.1)':'1px solid rgba(59,130,246,0.2)' }}>{quota.tier}</span>
            <span style={{ borderLeft:'1px solid var(--border-color)', height:'10px' }} />
            <span>Sims: {quota.limits.simulate===Infinity?'∞':`${quota.usage.simulate}/${quota.limits.simulate}`}</span>
          </div>
        )}
      </div>

      {/* Right nav */}
      <div className="navbar-links">
        {/* Theme */}
        <button onClick={toggleTheme} title={`Switch to ${theme==='dark'?'light':'dark'} mode`}
          style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', cursor:'pointer', width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)', transition:'var(--transition-smooth)' }}
          onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor='var(--border-bright)'; e.currentTarget.style.color='var(--text-primary)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='var(--border-color)'; e.currentTarget.style.color='var(--text-secondary)'; }}>
          {theme==='dark' ? <Sun size={15}/> : <Moon size={15}/>}
        </button>

        {isAuthenticated ? (
          <>
            <NavLink to="/"         end className={({isActive})=>`nav-link${isActive?' active':''}`}><LayoutDashboard size={14}/>Dashboard</NavLink>
            <NavLink to="/ide"          className={({isActive})=>`nav-link${isActive?' active':''}`}><Cpu size={14}/>IDE</NavLink>
            <NavLink to="/resources"    className={({isActive})=>`nav-link${isActive?' active':''}`}><FolderOpen size={14}/>Projects</NavLink>
            <NavLink to="/cloud"        className={({isActive})=>`nav-link${isActive?' active':''}`}><Cloud size={14}/>Cloud</NavLink>
            <NavLink to="/copilot"      className={({isActive})=>`nav-link${isActive?' active':''}`}
              style={({isActive})=>isActive?{color:'#a78bfa',background:'rgba(139,92,246,0.12)',borderColor:'rgba(139,92,246,0.25)'}:{}}>
              <BrainCircuit size={14}/>QuAI
            </NavLink>

            {/* Avatar dropdown */}
            <div className="navbar-avatar-wrap" ref={dropRef}>
              <button className="navbar-avatar-btn" onClick={()=>setDropOpen(v=>!v)}>
                <Avatar email={email} size={30}/>
                <ChevronDown size={12} style={{ color:'var(--text-muted)', transition:'transform 0.2s', transform: dropOpen?'rotate(180deg)':'rotate(0deg)' }}/>
              </button>

              {dropOpen && (
                <div className="navbar-dropdown">
                  {/* User info */}
                  <div className="navbar-dropdown-header">
                    <Avatar email={email} size={36}/>
                    <div>
                      <div className="navbar-dropdown-name">{username}</div>
                      <div className="navbar-dropdown-email">{email || 'developer'}</div>
                    </div>
                  </div>
                  <div className="navbar-dropdown-divider"/>

                  {[
                    { icon: User,     label:'Profile',    to:'/profile' },
                    { icon: FolderOpen,label:'My Projects',to:'/resources' },
                    { icon: Cloud,    label:'Cloud Jobs', to:'/cloud' },
                    { icon: BrainCircuit,label:'QuAI Copilot',to:'/copilot' },
                  ].map(item=>(
                    <NavLink key={item.to} to={item.to} className="navbar-dropdown-item"
                      onClick={()=>setDropOpen(false)}>
                      <item.icon size={14}/>{item.label}
                    </NavLink>
                  ))}

                  <div className="navbar-dropdown-divider"/>
                  <button className="navbar-dropdown-item" onClick={() => {
                    setDropOpen(false);
                    // trigger upgrade or plan actions
                  }}>
                    <Star size={14}/>{quota?.tier === 'free' ? 'Upgrade to Pro' : 'Pro Plan'}
                  </button>
                  
                  <NavLink to="/settings" className="navbar-dropdown-item" onClick={() => setDropOpen(false)}>
                    <Settings size={14}/>Settings
                  </NavLink>

                  <button className="navbar-dropdown-item" onClick={() => {
                    setDropOpen(false);
                    // trigger shortcuts or command palette
                    const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
                    window.dispatchEvent(e);
                  }}>
                    <Keyboard size={14}/>Shortcuts
                  </button>

                  <div className="navbar-dropdown-divider"/>
                  <button className="navbar-dropdown-item navbar-dropdown-item--danger" onClick={handleLogout}>
                    <LogOut size={14}/>Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <NavLink to="/login"    className={({isActive})=>`nav-link${isActive?' active':''}`}>Login</NavLink>
            <NavLink to="/register" className={({isActive})=>`nav-link${isActive?' active':''}`}>Register</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
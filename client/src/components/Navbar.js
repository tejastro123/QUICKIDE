import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import {
  Cpu, FolderOpen, Cloud, Sun, Moon, LogOut, Zap
} from 'lucide-react';

function Navbar() {
  const { isAuthenticated, logout, quota } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} style={{ color: 'var(--quantum-cyan)', flexShrink: 0, filter: 'drop-shadow(0 0 6px var(--quantum-cyan))' }} />
          QuickIDE
        </NavLink>
      </div>

      {/* Center status badge and quota indicator */}
      <div className="navbar-center" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isAuthenticated && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            background: 'rgba(52, 211, 153, 0.08)',
            border: '1px solid rgba(52, 211, 153, 0.2)',
            borderRadius: 'var(--radius-pill)',
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: '600',
            color: 'var(--quantum-green)',
            letterSpacing: '0.04em',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--quantum-green)',
              boxShadow: '0 0 6px var(--quantum-green)',
              animation: 'pulseGlow 2s ease-in-out infinite'
            }} />
            CONNECTED
          </div>
        )}

        {isAuthenticated && quota && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-pill)',
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: '500',
            color: 'var(--text-secondary)'
          }}>
            <span style={{
              textTransform: 'uppercase',
              color: quota.tier === 'free' ? 'var(--text-secondary)' : 'var(--quantum-cyan)',
              fontWeight: '700',
              fontSize: '0.68rem',
              background: quota.tier === 'free' ? 'rgba(255,255,255,0.06)' : 'rgba(59, 130, 246, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: quota.tier === 'free' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              {quota.tier}
            </span>
            <span style={{ borderLeft: '1px solid var(--border-color)', height: '10px' }} />
            <span>
              Sims: {quota.limits.simulate === Infinity ? '∞' : `${quota.usage.simulate}/${quota.limits.simulate}`}
            </span>
            <span style={{ borderLeft: '1px solid var(--border-color)', height: '10px' }} />
            <span>
              Compiles: {quota.limits.compile === Infinity ? '∞' : `${quota.usage.compile}/${quota.limits.compile}`}
            </span>
          </div>
        )}
      </div>

      {/* Nav links */}
      <div className="navbar-links">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            transition: 'var(--transition-smooth)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'var(--border-bright)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {theme === 'dark'
            ? <Sun size={15} />
            : <Moon size={15} />
          }
        </button>

        {isAuthenticated ? (
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Cpu size={14} />
              IDE
            </NavLink>
            <NavLink
              to="/resources"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <FolderOpen size={14} />
              Projects
            </NavLink>
            <NavLink
              to="/cloud"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Cloud size={14} />
              Cloud
            </NavLink>

            <button onClick={handleLogout} className="logout-button">
              <LogOut size={13} />
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login"  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Login</NavLink>
            <NavLink to="/register" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Register</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
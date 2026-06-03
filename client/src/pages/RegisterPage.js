import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AuthPage.css';
import { Zap, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

function RegisterPage() {
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPw]   = useState('');
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [showPw, setShowPw]               = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading]             = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/register', { email, password });
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>

        {/* Brand */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Zap size={24} color="white" />
          </div>
          <span className="auth-logo-title">QuickIDE</span>
          <span className="auth-logo-subtitle">World's first QuCPL quantum circuit IDE</span>
        </div>

        <h2>Create account</h2>
        <p className="auth-tagline">Start building quantum circuits in minutes</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}
        {success && (
          <div className="auth-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={15} style={{ flexShrink: 0 }} />
            {success}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="reg-email">Email Address</label>
          <input
            type="email"
            id="reg-email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-password">Password</label>
          <div className="password-wrapper">
            <input
              type={showPw ? 'text' : 'password'}
              id="reg-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
            />
            <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reg-confirm">Confirm Password</label>
          <div className="password-wrapper">
            <input
              type={showConfirmPw ? 'text' : 'password'}
              id="reg-confirm"
              value={confirmPassword}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Re-enter password"
              required
            />
            <button type="button" className="pw-toggle" onClick={() => setShowConfirmPw(v => !v)} tabIndex={-1}>
              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading
            ? <><span className="btn-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Creating account…</>
            : <><UserPlus size={16} />Create Account</>
          }
        </button>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;
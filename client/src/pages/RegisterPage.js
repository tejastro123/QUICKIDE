import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AuthPage.css'; // We reuse the same CSS as the login page

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      // Call the register endpoint (note: no token needed for this)
      await axios.post('http://localhost:5000/api/auth/register', { email, password });
      
      setSuccess('Registration successful! Please log in.');

      // Wait 2 seconds, then redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Register for QuickIDE</h2>
        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>} {/* You can style .auth-success in CSS */ }
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email" id="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password" id="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password" id="confirmPassword" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} required
          />
        </div>

        <button type="submit">Register</button>
        
        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;
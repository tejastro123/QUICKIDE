import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AuthPage.css';
import { AuthContext } from '../context/AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      const { token } = response.data;
      login(token); // Updates AuthContext state + localStorage + axios headers
      navigate('/'); // Redirect to IDE
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Login to QuickIDE</h2>
        {error && <p className="auth-error">{error}</p>}
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
        <button type="submit">Login</button>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
export default LoginPage;
import React, { useContext } from 'react'; // 1. Import useContext
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { AuthContext } from '../context/AuthContext'; // 2. Import AuthContext

function Navbar() {
  // 3. Get auth state and logout function
  const { isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">QuickIDE</Link>
      </div>
      <div className="navbar-links">
        {/* 4. Conditionally show links */}
        {isAuthenticated ? (
          <>
            <Link to="/">IDE</Link>
            <Link to="/resources">Projects & Tutorials</Link>
            {/* Replaced invalid anchor with an accessible button styled like a link */}
            <button
              type="button"
              onClick={handleLogout}
              className="logout-button"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
                textDecoration: 'underline' // optional to look like a link
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
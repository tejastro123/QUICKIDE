import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">QuickIDE</Link>
      </div>
      <div className="navbar-links">
        <Link to="/">IDE</Link>
        <Link to="/resources">Projects & Tutorials</Link>
      </div>
    </nav>
  );
}

export default Navbar;
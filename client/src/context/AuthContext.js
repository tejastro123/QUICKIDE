import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { setAuthToken, setupInterceptors } from '../services/api';

const AuthContext = createContext();

/**
 * Decodes the payload of a JWT without any external library.
 * JWTs are base64url-encoded JSON \u2014 we just need the middle (payload) segment.
 * Returns the decoded payload object, or null if the token is malformed.
 */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    // Convert base64url \u2192 base64 by replacing URL-safe chars
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Returns true if the JWT token has expired (or is unparsable).
 * `exp` in the JWT payload is UNIX seconds; Date.now() is milliseconds.
 */
function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  // Add a 10-second buffer so we log out slightly before the server rejects it
  return Date.now() >= (payload.exp - 10) * 1000;
}

const AuthProvider = ({ children }) => {
  // Read persisted token from localStorage on mount
  const storedToken = localStorage.getItem('token');

  // If there is a stored token but it's already expired, discard it immediately
  // so the user is never silently left with a broken session.
  const initialToken =
    storedToken && !isTokenExpired(storedToken) ? storedToken : null;

  if (storedToken && !initialToken) {
    // Clean up the expired token from storage on first render
    localStorage.removeItem('token');
  }

  const [token, setToken] = useState(initialToken);
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialToken);

  // We use a ref so the interceptor closure always sees the latest logout fn
  // without needing to re-register the interceptor on every render.
  const logoutRef = useRef(null);

  // -----------------------------------------------------------------------
  // logout \u2014 defined with useCallback so it has a stable identity and can
  // safely be passed into setupInterceptors.
  // -----------------------------------------------------------------------
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setAuthToken(null);
    setIsAuthenticated(false);
  }, []);

  // Keep the ref in sync with the latest logout function
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // -----------------------------------------------------------------------
  // Register the Axios 401 interceptor exactly once on mount.
  // We wrap logout in a stable arrow so the interceptor always delegates to
  // whatever logoutRef.current is, avoiding stale closure issues.
  // -----------------------------------------------------------------------
  useEffect(() => {
    setupInterceptors(() => logoutRef.current?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Whenever the token changes (login / logout / page reload), sync the
  // Axios default header.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
    } else {
      setAuthToken(null);
      setIsAuthenticated(false);
    }
  }, [token]);

  // -----------------------------------------------------------------------
  // login \u2014 called by LoginPage after a successful /auth/login response.
  // Handles localStorage, Axios headers, and React state in one place.
  // -----------------------------------------------------------------------
  const login = useCallback((newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setAuthToken(newToken);
    setIsAuthenticated(true);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
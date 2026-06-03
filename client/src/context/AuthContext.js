import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { setAuthToken, setupInterceptors, logoutUser, getUserQuota } from '../services/api';

const AuthContext = createContext();

/**
 * Decodes the payload of a JWT without any external library.
 * JWTs are base64url-encoded JSON — we just need the middle (payload) segment.
 * Returns the decoded payload object, or null if the token is malformed.
 */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    // Convert base64url → base64 by replacing URL-safe chars
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
  // Read persisted tokens from localStorage on mount
  const storedToken = localStorage.getItem('token');
  const storedRefreshToken = localStorage.getItem('refreshToken');

  // We are authenticated if we have an active access token OR a refresh token to obtain one
  const initialToken = storedToken && !isTokenExpired(storedToken) ? storedToken : null;
  const initialIsAuthenticated = !!(initialToken || storedRefreshToken);

  const [token, setToken] = useState(initialToken);
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);

  // We use refs so the interceptor closure always sees the latest functions
  // without needing to re-register the interceptor on every render.
  const logoutRef = useRef(null);
  const updateTokensRef = useRef(null);

  // -----------------------------------------------------------------------
  // logout — defined with useCallback so it has a stable identity.
  // Calls server-side logout to revoke refresh tokens.
  // -----------------------------------------------------------------------
  const logout = useCallback(() => {
    // Attempt server-side revocation (fire and forget)
    logoutUser().catch(() => {});

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setAuthToken(null);
    setIsAuthenticated(false);
  }, []);

  const updateTokens = useCallback((newToken, newRefreshToken) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    setToken(newToken);
    setAuthToken(newToken);
    setIsAuthenticated(true);
  }, []);

  // Keep the refs in sync
  useEffect(() => {
    logoutRef.current = logout;
    updateTokensRef.current = updateTokens;
  }, [logout, updateTokens]);

  // -----------------------------------------------------------------------
  // Register the Axios interceptors exactly once on mount.
  // -----------------------------------------------------------------------
  useEffect(() => {
    setupInterceptors(
      () => logoutRef.current?.(),
      (newToken, newRefreshToken) => updateTokensRef.current?.(newToken, newRefreshToken),
      (quotaData) => {
        window.dispatchEvent(new CustomEvent('quota-exceeded', { detail: quotaData }));
      }
    );
  }, []);

  // -----------------------------------------------------------------------
  // Whenever the token changes, sync the Axios default header.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
    } else if (!localStorage.getItem('refreshToken')) {
      setAuthToken(null);
      setIsAuthenticated(false);
    }
  }, [token]);

  // -----------------------------------------------------------------------
  // login — called by LoginPage after a successful /auth/login response.
  // -----------------------------------------------------------------------
  const login = useCallback((newToken, newRefreshToken) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    setToken(newToken);
    setAuthToken(newToken);
    setIsAuthenticated(true);
  }, []);

  const [quota, setQuota] = useState(null);

  const fetchQuota = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const response = await getUserQuota();
      setQuota(response.data);
    } catch (err) {
      console.error('Failed to fetch user quota:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchQuota();
    } else {
      setQuota(null);
    }
  }, [isAuthenticated, token, fetchQuota]);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout, quota, fetchQuota }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
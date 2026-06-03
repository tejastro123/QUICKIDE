/**
 * App.test.js  —  QuickIDE React smoke tests
 *
 * Replaced the broken CRA default test ("learn react link") with
 * tests that actually apply to this application.
 *
 * The App component requires AuthProvider + BrowserRouter context,
 * so we wrap it in a lightweight test utility.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// ------------------------------------------------------------------
// Minimal mock of AuthContext so tests don't need a live token or
// localStorage and so the interceptor setup doesn't run.
// ------------------------------------------------------------------
const mockAuthContext = {
  token: null,
  isAuthenticated: false,
  login: jest.fn(),
  logout: jest.fn(),
};

const TestProviders = ({ children, authValue = mockAuthContext }) => (
  <AuthContext.Provider value={authValue}>
    <MemoryRouter initialEntries={['/login']}>{children}</MemoryRouter>
  </AuthContext.Provider>
);

// ------------------------------------------------------------------
// Import only the lightweight leaf components so we avoid needing
// Monaco, Allotment, and the full IDE wired up.
// ------------------------------------------------------------------
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ErrorBoundary from './components/ErrorBoundary';

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('LoginPage', () => {
  it('renders the login heading', () => {
    render(
      <TestProviders>
        <LoginPage />
      </TestProviders>
    );
    expect(screen.getByRole('heading', { name: /login to quickide/i })).toBeInTheDocument();
  });

  it('renders email and password fields', () => {
    render(
      <TestProviders>
        <LoginPage />
      </TestProviders>
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(
      <TestProviders>
        <LoginPage />
      </TestProviders>
    );
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('has a link to the registration page', () => {
    render(
      <TestProviders>
        <LoginPage />
      </TestProviders>
    );
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
  });
});

describe('RegisterPage', () => {
  it('renders the register heading', () => {
    render(
      <TestProviders>
        <RegisterPage />
      </TestProviders>
    );
    expect(screen.getByRole('heading', { name: /register for quickide/i })).toBeInTheDocument();
  });

  it('renders password confirmation field', () => {
    render(
      <TestProviders>
        <RegisterPage />
      </TestProviders>
    );
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('has a link back to login', () => {
    render(
      <TestProviders>
        <RegisterPage />
      </TestProviders>
    );
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  // Suppress React's error console output during this test
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    console.error.mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <span>All good</span>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    const Bomb = () => {
      throw new Error('Test explosion');
    };
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders a custom fallback when provided', () => {
    const Bomb = () => {
      throw new Error('boom');
    };
    render(
      <ErrorBoundary fallback={<p>Custom error UI</p>}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });
});

import React from 'react';

/**
 * ErrorBoundary
 * =============
 * Catches JavaScript errors in any child component tree and renders a
 * graceful fallback UI instead of the blank white screen that React shows
 * when an unhandled component error propagates to the root.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponentThatMightCrash />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Something broke.</p>}>
 *     ...
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console (replace with a real error reporting service in production)
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Allow the parent to supply a fully custom fallback
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, errorInfo } = this.state;

    return (
      <div style={styles.overlay}>
        <div style={styles.card}>
          <div style={styles.iconRow}>
            <span style={styles.icon}>⚠️</span>
          </div>
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.subtitle}>
            An unexpected error occurred in this part of the application.
          </p>

          {/* Collapsible error details for developers */}
          <details style={styles.details}>
            <summary style={styles.summary}>Developer details</summary>
            <pre style={styles.pre}>
              {error && error.toString()}
              {'\n\n'}
              {errorInfo && errorInfo.componentStack}
            </pre>
          </details>

          <div style={styles.buttonRow}>
            <button style={styles.btnPrimary} onClick={this.handleReset}>
              Try again
            </button>
            <button style={styles.btnSecondary} onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// ---------------------------------------------------------------------------
// Inline styles — no external CSS dependency so this works standalone
// ---------------------------------------------------------------------------
const styles = {
  overlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    padding: '1rem',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    maxWidth: '540px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(12px)',
  },
  iconRow: {
    textAlign: 'center',
    marginBottom: '1rem',
  },
  icon: {
    fontSize: '3rem',
  },
  title: {
    color: '#e8e8f0',
    fontSize: '1.4rem',
    fontWeight: 700,
    textAlign: 'center',
    margin: '0 0 0.5rem',
  },
  subtitle: {
    color: '#9494aa',
    fontSize: '0.95rem',
    textAlign: 'center',
    margin: '0 0 1.5rem',
    lineHeight: 1.5,
  },
  details: {
    marginBottom: '1.5rem',
  },
  summary: {
    color: '#6a7bb5',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginBottom: '0.5rem',
    userSelect: 'none',
  },
  pre: {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '0.75rem',
    color: '#ff8787',
    fontSize: '0.78rem',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  buttonRow: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.4rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnSecondary: {
    background: 'transparent',
    color: '#9494aa',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '0.6rem 1.4rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
};

export default ErrorBoundary;

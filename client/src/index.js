import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Suppress benign ResizeObserver and browser extension console/overlay noise
const suppressThirdPartyAndResizeErrors = (event) => {
  const message = event?.message || event?.error?.message || '';
  const filename = event?.filename || '';
  const stack = event?.error?.stack || '';

  if (
    message.includes('ResizeObserver') ||
    filename.includes('content-all.js') ||
    stack.includes('content-all.js') ||
    message.includes('t.forEach is not a function')
  ) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
};

window.addEventListener('error', suppressThirdPartyAndResizeErrors, true);
window.addEventListener('unhandledrejection', (event) => {
  const message = event?.reason?.message || '';
  const stack = event?.reason?.stack || '';
  if (message.includes('ResizeObserver') || stack.includes('content-all.js') || message.includes('t.forEach is not a function')) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
}, true);

// Suppress console.error/warn messages injected by browser extensions/tracking prevention
const originalConsoleError = console.error;
console.error = function (...args) {
  const msg = args.join(' ');
  if (
    msg.includes('content-all.js') ||
    msg.includes('t.forEach') ||
    msg.includes('Tracking Prevention')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = function (...args) {
  const msg = args.join(' ');
  if (msg.includes('Tracking Prevention')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
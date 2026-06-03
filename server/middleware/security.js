/**
 * Custom security headers middleware (Dependency-free alternative to Helmet)
 */
module.exports = function securityHeaders() {
  return (req, res, next) => {
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable browser XSS filtering (legacy support)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Control referrer information sent with requests
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy (CSP)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' http://localhost:5000 http://localhost:5001 http://localhost:3000;"
    );

    next();
  };
};

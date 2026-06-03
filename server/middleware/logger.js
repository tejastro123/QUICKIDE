/**
 * Custom request logging middleware
 * Prints structured JSON logs to stdout for easy aggregation.
 */
module.exports = function logger() {
  return (req, res, next) => {
    const start = Date.now();
    const { method, url } = req;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    // Override res.end to capture response code and time
    const originalEnd = res.end;
    res.end = function (...args) {
      res.end = originalEnd;
      res.end.apply(this, args);

      const duration = Date.now() - start;
      const logData = {
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
        message: `${method} ${url} ${res.statusCode} - ${duration}ms`,
        context: {
          requestId: req.requestId,
          method,
          url,
          status: res.statusCode,
          durationMs: duration,
          ip,
          userAgent,
          userId: req.user ? req.user.id : undefined
        }
      };

      console.log(JSON.stringify(logData));
    };

    next();
  };
};

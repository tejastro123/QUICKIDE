/**
 * server/middleware/rateLimiter.js
 * =================================
 * Custom in-memory rate limiting middleware.
 *
 * Supports two key modes:
 *   - IP-based (default)        — keyed by req.ip / x-forwarded-for
 *   - User-based (authenticated) — keyed by req.user.id when keyBy:'user'
 *
 * Preset limiters exported at the bottom for convenience.
 */

const rateLimitStore = {};

/**
 * Core rate limiter factory.
 *
 * @param {Object} options
 * @param {number}  options.windowMs  - Time window in milliseconds
 * @param {number}  options.max       - Max requests allowed per window
 * @param {Object}  options.message   - Error response body
 * @param {string}  options.keyBy     - 'ip' (default) or 'user'
 */
function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 min default
  const max      = options.max      || 100;
  const keyBy    = options.keyBy    || 'ip';
  const message  = options.message  || { error: 'Too many requests, please try again later.' };

  // Periodic cleanup to avoid memory leak
  setInterval(() => {
    const now = Date.now();
    for (const key in rateLimitStore) {
      if (rateLimitStore[key].resetTime < now) {
        delete rateLimitStore[key];
      }
    }
  }, windowMs).unref();

  return (req, res, next) => {
    // Determine rate-limit key
    let key;
    if (keyBy === 'user' && req.user && req.user.id) {
      key = `user:${req.user.id}`;
    } else {
      key = `ip:${req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'}`;
    }

    const now = Date.now();

    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
      rateLimitStore[key] = { count: 1, resetTime: now + windowMs };
    } else {
      rateLimitStore[key].count++;
    }

    const current = rateLimitStore[key];
    res.setHeader('X-RateLimit-Limit',     max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current.count));
    res.setHeader('X-RateLimit-Reset',     Math.ceil(current.resetTime / 1000));

    if (current.count > max) {
      return res.status(429).json(message);
    }
    next();
  };
}

// ─── Preset limiters ──────────────────────────────────────────────────────────

/** Global: 1000 req per 10 min per IP */
rateLimiter.global = () => rateLimiter({ windowMs: 10 * 60 * 1000, max: 1000 });

/** Auth endpoints: 30 attempts per 10 min per IP */
rateLimiter.auth = () => rateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please try again in 10 minutes.' },
});

/**
 * Simulation: 50 runs per hour per authenticated user.
 * Falls back to IP-based if no auth (should not happen on protected routes).
 */
rateLimiter.simulation = () => rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyBy: 'user',
  message: {
    error: 'Simulation limit reached (50/hour). Upgrade to Pro for higher limits.',
    code: 'RATE_LIMIT_SIMULATION',
  },
});

/**
 * Share creation: 30 snippets per hour per IP.
 */
rateLimiter.share = () => rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Too many share requests. Please try again later.' },
});

module.exports = rateLimiter;

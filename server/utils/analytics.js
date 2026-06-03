const AnalyticsEvent = require('../models/AnalyticsEvent');

/**
 * Log an analytics event to the database asynchronously.
 * Catches and logs errors internally to prevent blocking the request chain.
 * 
 * @param {string} eventName - Name of the event (e.g. 'compile', 'simulate')
 * @param {string|ObjectId} userId - ID of the user triggering the event (optional)
 * @param {Object} metadata - Contextual data (durationMs, qubitCount, etc)
 */
async function trackEvent(eventName, userId, metadata = {}) {
  try {
    const analytic = new AnalyticsEvent({
      event: eventName,
      userId: userId || null,
      metadata
    });
    await analytic.save();
  } catch (err) {
    // Log failure but do not crash/block the request
    console.error(JSON.stringify({
      level: 'ERROR',
      message: 'Failed to record analytics event',
      error: err.message,
      event: eventName
    }));
  }
}

module.exports = { trackEvent };

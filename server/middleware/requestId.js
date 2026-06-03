const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

// AsyncLocalStorage store to track request ID across asynchronous call chains
const requestStore = new AsyncLocalStorage();

/**
 * Request ID Middleware
 * 
 * Generates a unique UUID v4 for each request and stores it in AsyncLocalStorage.
 */
function requestId() {
  return (req, res, next) => {
    const id = req.header('X-Request-ID') || crypto.randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    
    // Run next middleware/handlers inside the request storage context
    requestStore.run(id, next);
  };
}

module.exports = requestId;
module.exports.requestStore = requestStore;

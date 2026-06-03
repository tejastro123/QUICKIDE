const UsageQuota = require('../models/UsageQuota');
const User = require('../models/User');

const TIER_LIMITS = {
  free: {
    simulate: 10,
    compile: 50,
    maxQubits: 15
  },
  pro: {
    simulate: 100,
    compile: Infinity,
    maxQubits: 25
  },
  admin: {
    simulate: Infinity,
    compile: Infinity,
    maxQubits: Infinity
  }
};

const quota = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required for quota enforcement' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Admin role overrides to admin tier
      const tier = user.role === 'admin' ? 'admin' : (user.tier || 'free');
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

      // 1. Qubit validation if request has qubits
      if (action === 'simulate' || action === 'compile') {
        const qubits = req.body.ir?.qubits || req.body.ast?.qubits || [];
        if (qubits.length > limits.maxQubits) {
          return res.status(403).json({
            error: `Qubit limit exceeded. Your tier (${tier}) allows up to ${limits.maxQubits} qubits.`,
            tier,
            limit: limits.maxQubits,
            requested: qubits.length
          });
        }
      }

      // 2. Daily count validation
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const usage = await UsageQuota.findOne({ userId: req.user.id, date: today });
      
      const currentCount = usage ? (action === 'simulate' ? usage.simCount : usage.compileCount) : 0;
      const limit = limits[action];

      if (currentCount >= limit) {
        return res.status(429).json({
          error: `Daily limit for ${action} reached. Your tier (${tier}) allows up to ${limit} per day.`,
          tier,
          limit,
          usage: currentCount
        });
      }

      // 3. Attach hook to increment quota on successful finish
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const incField = action === 'simulate' ? 'simCount' : 'compileCount';
            await UsageQuota.findOneAndUpdate(
              { userId: req.user.id, date: today },
              { $inc: { [incField]: 1 } },
              { upsert: true, new: true }
            );
          } catch (incErr) {
            console.error('Failed to increment user quota:', incErr.message);
          }
        }
      });

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = quota;

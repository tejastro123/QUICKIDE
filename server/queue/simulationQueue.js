const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://192.168.4.145:6379';
let connection;
let simulationQueue;

try {
  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  connection.on('error', (err) => {
    console.warn('[REDIS WARNING] Redis connection error:', err.message);
  });

  simulationQueue = new Queue('simulations', {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: { age: 3600 }, // remove job history older than 1 hr
      removeOnFail: { age: 86400 }     // keep fails for 24h
    }
  });
  console.log('[QUEUE] Simulation queue initialized.');
} catch (err) {
  console.error('[QUEUE ERROR] Failed to initialize Redis/BullMQ queue:', err.message);
}

module.exports = {
  queue: simulationQueue,
  connection
};

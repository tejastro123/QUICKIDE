const { Worker } = require('bullmq');
const axios = require('axios');

const redisUrl = process.env.REDIS_URL || 'redis://192.168.4.145:6379';
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

const worker = new Worker('simulations', async (job) => {
  const { ir, backend, theme, requestId } = job.data;

  const headers = {};

  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }

  const response = await axios.post(`${PYTHON_API_URL}/simulate`, { ir, backend, theme }, {
    responseType: 'arraybuffer',
    headers
  });

  // Return base64 string representing the PNG bytes
  return Buffer.from(response.data).toString('base64');
}, {
  connection: {
    url: redisUrl
  },
  concurrency: 3
});

worker.on('completed', (job) => {
  console.log(`[WORKER] Job ${job.id} completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job.id} failed:`, err.message);
});

module.exports = worker;

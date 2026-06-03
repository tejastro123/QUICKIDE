const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Rate Limiter Middleware', () => {
  it('should trigger 429 Too Many Requests after exceeding limit on auth routes', async () => {
    // Auth limiter allows 10 requests per 10 minutes per IP.
    // Let's call /api/auth/login 11 times. The 11th should return 429.
    const promises = [];
    for (let i = 0; i < 11; i++) {
      promises.push(
        request(app)
          .post('/api/auth/login')
          .send({ email: 'nonexistent@example.com', password: 'password' })
      );
    }

    const responses = await Promise.all(promises);
    const statuses = responses.map(res => res.statusCode);
    
    // There should be at least one 429 status code in the batch (typically the later ones)
    const has429 = statuses.includes(429);
    expect(has429).toBe(true);
  });
});

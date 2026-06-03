const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'Password123!';
let accessToken = '';
let refreshToken = '';

beforeAll(async () => {
  // Clear any existing test user if any
  await User.deleteMany({ email: /test_.*@example\.com/ });
});

afterAll(async () => {
  await User.deleteMany({ email: /test_.*@example\.com/ });
  await mongoose.connection.close();
});

describe('Authentication Endpoints', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: testEmail,
        password: testPassword
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
  });

  it('should login the registered user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should fail login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should refresh the access token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should logout the user and invalidate refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Logged out successfully');
  });

  it('should reject already invalidated refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.statusCode).toEqual(403);
  });
});

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Project = require('../models/Project');

let tokenUserA = '';
let tokenUserB = '';
let projectIdUserA = '';

beforeAll(async () => {
  // Setup User A
  const emailA = `usera_${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({
    username: 'usera',
    email: emailA,
    password: 'Password123!'
  });
  const loginA = await request(app).post('/api/auth/login').send({
    email: emailA,
    password: 'Password123!'
  });
  tokenUserA = loginA.body.accessToken;

  // Setup User B
  const emailB = `userb_${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({
    username: 'userb',
    email: emailB,
    password: 'Password123!'
  });
  const loginB = await request(app).post('/api/auth/login').send({
    email: emailB,
    password: 'Password123!'
  });
  tokenUserB = loginB.body.accessToken;
});

afterAll(async () => {
  await User.deleteMany({ email: /user(a|b)_.*@example\.com/ });
  await Project.deleteMany({});
  await mongoose.connection.close();
});

describe('Project CRUD & Ownership Boundaries', () => {
  it('should create a project for User A', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: 'Quantum Test Project',
        code: 'qubit q0; h q0;'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('name', 'Quantum Test Project');
    projectIdUserA = res.body._id;
  });

  it('should fetch User A\'s projects list', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]._id).toEqual(projectIdUserA);
  });

  it('should allow User A to read their own project', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectIdUserA}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('name', 'Quantum Test Project');
  });

  it('should deny User B from reading User A\'s project', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectIdUserA}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    // Ownership check should fail with 403 or 404 (not found / not owned)
    expect([403, 404]).toContain(res.statusCode);
  });

  it('should allow User A to update their own project', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectIdUserA}`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: 'Updated Project Name',
        code: 'qubit q0; x q0;'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('name', 'Updated Project Name');
  });

  it('should deny User B from updating User A\'s project', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectIdUserA}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        name: 'Hacked Project Name',
        code: 'qubit q0;'
      });

    expect([403, 404]).toContain(res.statusCode);
  });

  it('should deny User B from deleting User A\'s project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectIdUserA}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect([403, 404]).toContain(res.statusCode);
  });

  it('should allow User A to delete their own project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectIdUserA}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.statusCode).toEqual(200);
  });
});

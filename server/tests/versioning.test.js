const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Project = require('../models/Project');
const ProjectVersion = require('../models/ProjectVersion');

let token = '';
let projectId = '';

beforeAll(async () => {
  const email = `versionuser_${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({
    username: 'versionuser',
    email,
    password: 'Password123!'
  });
  const login = await request(app).post('/api/auth/login').send({
    email,
    password: 'Password123!'
  });
  token = login.body.accessToken;

  // Create a project
  const projRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Versioning Project',
      code: 'qubit q0;'
    });
  projectId = projRes.body._id;
});

afterAll(async () => {
  await User.deleteMany({ email: /versionuser_.*@example\.com/ });
  await Project.deleteMany({});
  await ProjectVersion.deleteMany({});
  await mongoose.connection.close();
});

describe('Project Version Control API', () => {
  it('should save a version history snapshot when code changes', async () => {
    // 1. Update project code (first change)
    await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'qubit q0; h q0;'
      });

    // 2. Fetch versions - should have 1 version snapshot representing the original 'qubit q0;' code
    const res = await request(app)
      .get(`/api/projects/${projectId}/versions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.versions.length).toBe(1);
    expect(res.body.versions[0].code).toEqual('qubit q0;');
  });

  it('should restore project code and save a backup before doing so', async () => {
    // 1. Get the version ID of the original code
    const versionsRes = await request(app)
      .get(`/api/projects/${projectId}/versions`)
      .set('Authorization', `Bearer ${token}`);
    
    const targetVersionId = versionsRes.body.versions[0]._id;

    // 2. Restore to that version
    const restoreRes = await request(app)
      .post(`/api/projects/${projectId}/restore/${targetVersionId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(restoreRes.statusCode).toEqual(200);
    expect(restoreRes.body.code).toEqual('qubit q0;');

    // 3. Verify that a backup was automatically created of the state BEFORE restore ('qubit q0; h q0;')
    const postRestoreVersions = await request(app)
      .get(`/api/projects/${projectId}/versions`)
      .set('Authorization', `Bearer ${token}`);

    // Should have original version, plus the backup version
    expect(postRestoreVersions.body.versions.length).toBe(2);
    expect(postRestoreVersions.body.versions[0].code).toEqual('qubit q0; h q0;');
  });

  it('should cap the version snapshots at a maximum of 50', async () => {
    // Write code multiple times in a loop to exceed the 50 versions limit
    const promises = [];
    for (let i = 0; i < 55; i++) {
      await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: `qubit q0; x q0; // version ${i}`
        });
    }

    const res = await request(app)
      .get(`/api/projects/${projectId}/versions`)
      .set('Authorization', `Bearer ${token}`);

    // Since we keep a max of 50 versions in the history, the total count should not exceed 50
    expect(res.body.totalVersions).toBeLessThanOrEqual(50);
  });
});

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const RefreshToken = require('./models/RefreshToken');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quickide';
const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

async function testRBAC() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('Database connected.');

  // Clean up existing test users if any
  await User.deleteMany({ email: /@test-rbac\.com$/ });

  // 1. Create standard user
  const salt = await bcrypt.genSalt(10);
  const userPass = await bcrypt.hash('password123', salt);
  const standardUser = new User({
    email: 'user@test-rbac.com',
    password: userPass,
    role: 'user'
  });
  await standardUser.save();
  console.log('Standard user created.');

  // 2. Create admin user
  const adminUser = new User({
    email: 'admin@test-rbac.com',
    password: userPass,
    role: 'admin'
  });
  await adminUser.save();
  console.log('Admin user created.');

  // Generate tokens
  const userToken = jwt.sign({ user: { id: standardUser.id } }, JWT_SECRET);
  const adminToken = jwt.sign({ user: { id: adminUser.id } }, JWT_SECRET);

  console.log('Mock tokens generated.');
  console.log('User Token:', userToken.substring(0, 15) + '...');
  console.log('Admin Token:', adminToken.substring(0, 15) + '...');

  // Perform mock HTTP requests locally by invoking middleware directly
  const authMiddleware = require('./middleware/auth');
  const requireRoleMiddleware = authMiddleware.requireRole('admin');

  // Helper to run middleware chains manually, resolving if next() or res.json() is called
  const runMiddleware = (middleware, req, res) => {
    return new Promise((resolve) => {
      const originalJson = res.json;
      res.json = (data) => {
        res.json = originalJson; // restore
        originalJson.call(res, data);
        resolve({ nextCalled: false });
      };

      middleware(req, res, (err) => {
        res.json = originalJson; // restore
        if (err) return resolve({ nextCalled: false, error: err });
        resolve({ nextCalled: true });
      });
    });
  };

  // Test Standard User
  console.log('\n--- Testing Standard User Access ---');
  let mockReq = {
    header: (name) => name === 'Authorization' ? `Bearer ${userToken}` : null
  };
  let mockRes = {
    status: (code) => {
      mockRes.statusCode = code;
      return mockRes;
    },
    json: (data) => {
      mockRes.body = data;
      return mockRes;
    }
  };

  // Run Auth
  await runMiddleware(authMiddleware, mockReq, mockRes);
  console.log('Auth middleware executed. user ID attached:', mockReq.user?.id);

  // Run Role Check
  const standardResult = await runMiddleware(requireRoleMiddleware, mockReq, mockRes);
  if (!standardResult.nextCalled) {
    console.log(`PASS: Standard user blocked with status ${mockRes.statusCode}:`, mockRes.body);
  } else {
    console.log('FAIL: Standard user allowed to proceed!');
  }

  // Test Admin User
  console.log('\n--- Testing Admin User Access ---');
  mockReq = {
    header: (name) => name === 'Authorization' ? `Bearer ${adminToken}` : null
  };
  mockRes = {
    status: (code) => {
      mockRes.statusCode = code;
      return mockRes;
    },
    json: (data) => {
      mockRes.body = data;
      return mockRes;
    }
  };

  // Run Auth
  await runMiddleware(authMiddleware, mockReq, mockRes);
  console.log('Auth middleware executed. user ID attached:', mockReq.user?.id);

  // Run Role Check
  const adminResult = await runMiddleware(requireRoleMiddleware, mockReq, mockRes);
  if (adminResult.nextCalled) {
    console.log('PASS: Admin user allowed to proceed to route handler.');
  } else {
    console.log(`FAIL: Admin user blocked with status ${mockRes.statusCode}:`, mockRes.body);
  }

  // Clean up
  await User.deleteMany({ email: /@test-rbac\.com$/ });
  await mongoose.disconnect();
  console.log('\nDatabase disconnected. Test complete.');
}

testRBAC().catch(err => {
  console.error('Test failed with error:', err);
  mongoose.disconnect();
});

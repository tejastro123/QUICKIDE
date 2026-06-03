const mongoose = require('mongoose');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { trackEvent } = require('../utils/analytics');

afterAll(async () => {
  await AnalyticsEvent.deleteMany({});
  await mongoose.connection.close();
});

describe('Analytics Engine API', () => {
  it('should successfully log a new analytics event to MongoDB', async () => {
    const testUserId = new mongoose.Types.ObjectId();
    
    await trackEvent('simulate', testUserId, {
      durationMs: 150,
      qubitCount: 5,
      backend: 'fake_manila'
    });

    const events = await AnalyticsEvent.find({ userId: testUserId });
    expect(events.length).toBe(1);
    expect(events[0].event).toEqual('simulate');
    expect(events[0].metadata.durationMs).toEqual(150);
    expect(events[0].metadata.qubitCount).toEqual(5);
    expect(events[0].metadata.backend).toEqual('fake_manila');
  });

  it('should verify schema defines TTL expiration index on createdAt', () => {
    const expires = AnalyticsEvent.schema.paths.createdAt.options.expires;
    expect(expires).toBe(7776000); // 90 days in seconds
  });
});

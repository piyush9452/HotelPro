import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { newClient, useTestDatabase } from './helpers/setup.js';

useTestDatabase();

describe('rate limiting', () => {
  it('limits repeated login attempts', async () => {
    process.env.ENABLE_RATE_LIMIT_IN_TESTS = 'true';
    try {
      const client = await newClient();
      const statuses = [];
      for (let i = 0; i < 12; i += 1) {
        const res = await client.post('/api/auth/login').send({ email: 'someone@example.com', password: 'Wrong1234' });
        statuses.push(res.status);
      }
      assert.equal(statuses.slice(0, 10).every((s) => s === 401), true);
      assert.equal(statuses.at(-1), 429);
    } finally {
      delete process.env.ENABLE_RATE_LIMIT_IN_TESTS;
    }
  });
});

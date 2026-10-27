import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { newClient, useTestDatabase } from './helpers/setup.js';

useTestDatabase();

describe('API error handling', () => {
  it('reports health with database status', async () => {
    const res = await (await newClient()).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.database, 'connected');
  });

  it('returns a consistent 404 for unknown routes', async () => {
    const res = await (await newClient()).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.deepEqual(Object.keys(res.body), ['success', 'error']);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('rejects malformed JSON with 400', async () => {
    const client = await newClient();
    const res = await client.post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_JSON');
  });

  it('rejects invalid object ids', async () => {
    const client = await newClient();
    assert.equal((await client.get('/api/rooms/123')).status, 400);
  });

  it('sets security headers and restricts CORS to the configured origin', async () => {
    const client = await newClient();
    const allowed = await client.get('/api/health').set('Origin', 'http://localhost:5173');
    assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(allowed.headers['access-control-allow-credentials'], 'true');
    assert.ok(allowed.headers['x-content-type-options']);
    assert.equal(allowed.headers['x-powered-by'], undefined);

    const denied = await client.get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(denied.headers['access-control-allow-origin'], undefined);
  });
});

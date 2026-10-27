import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PASSWORD, createUser, loggedInClient, newClient, useTestDatabase } from './helpers/setup.js';
import { User } from '../models/User.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';

useTestDatabase();

const registration = { name: 'Asha Rao', email: 'Asha@Example.com', phone: '+91 98765 43210', password: 'Secret123' };

describe('registration', () => {
  it('creates a user, hashes the password and starts a session', async () => {
    const client = await newClient();
    const res = await client.post('/api/auth/register').send(registration);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.email, 'asha@example.com');
    assert.equal(res.body.data.user.password, undefined);
    assert.match(res.headers['set-cookie'].join(';'), /hotelpro_token=.+HttpOnly/i);

    const stored = await User.findOne({ email: 'asha@example.com' }).select('+password');
    assert.notEqual(stored.password, registration.password);
    assert.match(stored.password, /^\$2[aby]\$/);
    assert.ok(await stored.comparePassword(registration.password));

    const me = await client.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, 'asha@example.com');
  });

  it('rejects duplicate emails regardless of case', async () => {
    const client = await newClient();
    await client.post('/api/auth/register').send(registration).expect(201);
    const res = await (await newClient()).post('/api/auth/register').send({ ...registration, email: 'ASHA@example.com' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'EMAIL_IN_USE');
  });

  it('never lets a client choose its own role', async () => {
    const client = await newClient();
    const res = await client.post('/api/auth/register').send({ ...registration, role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'user');
  });

  it('validates input', async () => {
    const client = await newClient();
    const res = await client.post('/api/auth/register').send({ name: 'A', email: 'bad', phone: 'x', password: 'short' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    for (const f of ['name', 'email', 'phone', 'password']) assert.ok(fields.includes(f), `${f} should be reported`);
  });
});

describe('login and sessions', () => {
  it('logs in with correct credentials and rejects wrong ones', async () => {
    const user = await createUser();
    const client = await newClient();
    const bad = await client.post('/api/auth/login').send({ email: user.email, password: 'WrongPass1' });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error.message, 'Invalid email or password');

    const unknown = await client.post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.error.message, 'Invalid email or password');

    const ok = await client.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    assert.equal(ok.status, 200);
  });

  it('protects /me and clears the session on logout', async () => {
    const anon = await newClient();
    assert.equal((await anon.get('/api/auth/me')).status, 401);

    const { client } = await loggedInClient();
    assert.equal((await client.get('/api/auth/me')).status, 200);
    await client.post('/api/auth/logout').expect(200);
    assert.equal((await client.get('/api/auth/me')).status, 401);
  });

  it('rejects tampered tokens', async () => {
    const client = await newClient();
    const res = await client.get('/api/auth/me').set('Cookie', 'hotelpro_token=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.');
    assert.equal(res.status, 401);
  });

  it('blocks deactivated accounts, including existing sessions', async () => {
    const { client, user } = await loggedInClient();
    await User.updateOne({ _id: user._id }, { isActive: false });
    assert.equal((await client.get('/api/auth/me')).status, 401);
    const login = await (await newClient()).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    assert.equal(login.status, 403);
  });

  it('rejects state-changing requests without a CSRF token', async () => {
    const { client, user } = await loggedInClient();
    const res = await client.agent.patch('/api/auth/me').send({ name: 'Changed Name' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'CSRF_INVALID');
    assert.equal((await User.findById(user._id)).name, user.name);
  });

  it('ignores NoSQL operator injection', async () => {
    await createUser();
    const client = await newClient();
    const res = await client.post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 400);
  });
});

describe('profile', () => {
  it('updates name and phone but not email or role', async () => {
    const { client } = await loggedInClient();
    const res = await client.patch('/api/auth/me').send({ name: 'New Name', phone: '9123456789', role: 'admin', email: 'x@y.com' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.name, 'New Name');
    assert.equal(res.body.data.user.role, 'user');
    assert.notEqual(res.body.data.user.email, 'x@y.com');
  });

  it('changes password only with the current password', async () => {
    const { client, user } = await loggedInClient();
    const wrong = await client.post('/api/auth/change-password').send({ currentPassword: 'Nope12345', newPassword: 'Brandnew123' });
    assert.equal(wrong.status, 400);
    await client.post('/api/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'Brandnew123' }).expect(200);
    assert.equal((await client.get('/api/auth/me')).status, 200, 'session is re-issued after change');
    const login = await (await newClient()).post('/api/auth/login').send({ email: user.email, password: 'Brandnew123' });
    assert.equal(login.status, 200);
  });
});

describe('password reset', () => {
  it('responds identically for known and unknown emails and never returns the token', async () => {
    const user = await createUser();
    const client = await newClient();
    const known = await client.post('/api/auth/forgot-password').send({ email: user.email });
    const unknown = await client.post('/api/auth/forgot-password').send({ email: 'missing@example.com' });
    assert.equal(known.status, 200);
    assert.deepEqual(known.body, unknown.body);
    assert.doesNotMatch(JSON.stringify(known.body), /[a-f0-9]{64}/);

    const stored = await PasswordResetToken.findOne({ user: user._id });
    assert.ok(stored, 'a token record is created');
    assert.equal(stored.tokenHash.length, 64);
  });

  it('resets the password with a valid token, invalidates old sessions, and is single-use', async () => {
    const { client: oldSession, user } = await loggedInClient();
    const raw = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      user: user._id,
      tokenHash: crypto.createHash('sha256').update(raw).digest('hex'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const client = await newClient();
    await client.post('/api/auth/reset-password').send({ token: raw, password: 'Recovered123' }).expect(200);
    const again = await client.post('/api/auth/reset-password').send({ token: raw, password: 'Recovered456' });
    assert.equal(again.status, 400);

    assert.equal((await oldSession.get('/api/auth/me')).status, 401, 'old sessions are revoked');
    const login = await client.post('/api/auth/login').send({ email: user.email, password: 'Recovered123' });
    assert.equal(login.status, 200);
  });

  it('rejects expired tokens', async () => {
    const user = await createUser();
    const raw = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      user: user._id,
      tokenHash: crypto.createHash('sha256').update(raw).digest('hex'),
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await (await newClient()).post('/api/auth/reset-password').send({ token: raw, password: 'Recovered123' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_RESET_TOKEN');
  });
});

describe('session bootstrap', () => {
  it('returns null for anonymous visitors and the user when signed in', async () => {
    const anon = await newClient();
    const res = await anon.get('/api/auth/session');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user, null);
    const { client, user } = await loggedInClient();
    const signedIn = await client.get('/api/auth/session');
    assert.equal(signedIn.body.data.user.email, user.email);
  });
});

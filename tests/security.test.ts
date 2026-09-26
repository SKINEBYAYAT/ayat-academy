import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, resetSchema, loginSchema } from '../src/lib/auth/validation';
import { hashPassword, verifyPassword, hashToken, newToken, newCode } from '../src/lib/auth/crypto';
import { sameOrigin, readJson, errorResponse, HttpError } from '../src/lib/http';
import { assertAuthConfig, assertEmailConfig } from '../src/lib/config';

process.env.AUTH_SECRET = 'unit-test-secret-only-not-a-deployment-secret';
process.env.APP_URL = 'https://academy.example';

test('registration validates confirmation, normalizes email, and strips role injection', () => {
  const input = { fullName: '  Ayat Student ', email: ' LEARNER@example.com ', password: 'A long unique passphrase!', passwordConfirmation: 'A long unique passphrase!', role: 'admin' };
  const parsed = registerSchema.parse(input);
  assert.equal(parsed.email, 'learner@example.com');
  assert.equal(parsed.fullName, 'Ayat Student');
  assert.equal('role' in parsed, false);
  assert.equal(registerSchema.safeParse({ ...input, passwordConfirmation: 'different' }).success, false);
  assert.equal(registerSchema.safeParse({ ...input, password: 'short', passwordConfirmation: 'short' }).success, false);
  assert.equal(registerSchema.safeParse({ ...input, password: '🧴'.repeat(20), passwordConfirmation: '🧴'.repeat(20) }).success, false);
});
test('MongoDB query operators cannot pass authentication validation', () => {
  assert.equal(loginSchema.safeParse({ email: { $ne: null }, password: { $gt: '' } }).success, false);
  assert.equal(resetSchema.safeParse({ token: { $ne: null }, password: 'valid long passphrase', passwordConfirmation: 'valid long passphrase' }).success, false);
});
test('passwords use salted bcrypt and tokens are opaque HMAC digests', async () => {
  const password = 'A long unique passphrase!';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.match(first, /^\$2[aby]\$12\$/);
  const token = newToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(hashToken(token).length, 64);
  assert.notEqual(hashToken(token), token);
  assert.notEqual(newToken(), token);
  assert.match(newCode(), /^\d{6}$/);
});
test('mutations reject missing/foreign origins and non-JSON requests', () => {
  const request = (headers: Record<string, string>) => new Request('https://academy.example/api/auth/login', { method: 'POST', headers });
  assert.throws(() => sameOrigin(request({ 'content-type': 'application/json' })), HttpError);
  assert.throws(() => sameOrigin(request({ origin: 'https://attacker.example', 'content-type': 'application/json' })), HttpError);
  assert.throws(() => sameOrigin(request({ origin: 'https://academy.example', 'content-type': 'text/plain' })), HttpError);
  assert.doesNotThrow(() => sameOrigin(request({ origin: 'https://academy.example', 'content-type': 'application/json' })));
});
test('JSON parsing rejects invalid and oversized input; internal errors stay private', async () => {
  await assert.rejects(readJson(new Request('https://academy.example', { method: 'POST', body: 'invalid' })), HttpError);
  await assert.rejects(readJson(new Request('https://academy.example', { method: 'POST', body: 'x'.repeat(8193) })), HttpError);
  assert.deepEqual(await readJson(new Request('https://academy.example', { method: 'POST', body: '{"ok":true}' })), { ok: true });
  const response = errorResponse(new Error('password=do-not-leak'));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('do-not-leak'), false);
});
test('missing service configuration fails explicitly without exposing credentials', () => {
  const prior = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  assert.throws(assertAuthConfig, /Database service is not configured/);
  if (prior) process.env.MONGODB_URI = prior;
  const provider = process.env.EMAIL_PROVIDER;
  process.env.EMAIL_PROVIDER = 'unimplemented-provider';
  assert.throws(assertEmailConfig, /Email service is not configured/);
  if (provider) process.env.EMAIL_PROVIDER = provider; else delete process.env.EMAIL_PROVIDER;
});

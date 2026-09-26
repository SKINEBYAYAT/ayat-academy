import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User, Session, TrustedDevice, VerificationCode, RateLimit } from '../../src/lib/db/models/auth';
import { Enrollment, Course, Level, Section, Lesson } from '../../src/lib/db/models/courses';
import { hashToken, hashPassword, newToken } from '../../src/lib/auth/crypto';
import { rateLimit } from '../../src/lib/auth/rate-limit';

// Integration tests use a disposable MongoDB only. Email codes are injected into that
// database to simulate delivery; these tests do not claim to verify an SMTP provider.
test('Phase 1 production HTTP and MongoDB security integration', { timeout: 300000 }, async t => {
  const mongo = await MongoMemoryServer.create();
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  let serverOutput = '';
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Session.init(), TrustedDevice.init(), VerificationCode.init(), RateLimit.init(), Enrollment.init()]);
  process.env.AUTH_SECRET = 'integration-only-secret-not-for-deployment-123456';
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const address = reservation.address(); assert.ok(address && typeof address !== 'string');
  const port = address.port; await new Promise<void>(resolve => reservation.close(() => resolve()));
  const base = `http://127.0.0.1:${port}`;
  const origin = 'https://academy.integration.test';
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', MONGODB_URI: mongo.getUri(), APP_URL: origin, EMAIL_PROVIDER: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: 'test', SMTP_PASSWORD: 'test', EMAIL_FROM: 'test@example.com' },
  });
  t.after(async () => {
    if (server.exitCode === null) { const stopped = once(server, 'exit'); server.kill(); await stopped; }
  });
  server.stdout?.on('data', buffer => { serverOutput += buffer.toString(); });
  server.stderr?.on('data', buffer => { serverOutput += buffer.toString(); });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Test server exited: ${serverOutput}`);
    try { const response = await fetch(base); if (response.ok) { ready = true; break; } } catch { /* Wait for startup. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, `Test server did not start: ${serverOutput}`);
  async function post(action: string, body: object, cookie = '') {
    return fetch(`${base}/api/auth/${action}`, { method: 'POST', headers: { origin, 'content-type': 'application/json', cookie, 'user-agent': 'integration-browser' }, body: JSON.stringify(body) });
  }
  function cookieValue(response: Response, name: string) {
    return response.headers.getSetCookie().find(value => value.startsWith(`${name}=`))?.split(';')[0] ?? '';
  }
  async function setKnownCode(challenge: string, code = '123456') {
    const result = await VerificationCode.updateOne({ tokenHash: hashToken(challenge) }, { $set: { codeHash: hashToken(`${challenge}:${code}`) } });
    assert.equal(result.modifiedCount, 1);
  }
  async function assertPageRedirect(response: Response, destination: string) {
    if (response.status === 307) { assert.equal(response.headers.get('location'), destination); return; }
    // The root loading boundary can start a streamed 200 response before auth
    // resolves. Next then emits its documented meta redirect, with no private UI.
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('id="__next-page-redirect"'));
    assert.ok(html.includes(`url=${destination}`));
    assert.equal(html.includes('student@example.com'), false);
    assert.equal(html.includes('Academy administration'), false);
  }
  const account = { fullName: 'Test Student', email: 'student@example.com', password: 'A secure student passphrase!', passwordConfirmation: 'A secure student passphrase!' };
  let challenge = '';
  let studentCookie = '';
  let deviceCookie = '';
  let adminCookie = '';

  await t.test('all public pages render; protected pages and APIs reject anonymous access', async () => {
    for (const page of ['/', '/register', '/login', '/verify', '/forgot-password', '/reset-password']) {
      const response = await fetch(base + page); assert.equal(response.status, 200, page);
      assert.match(await response.text(), /<h1/);
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
    }
    for (const page of ['/dashboard', '/admin']) {
      await assertPageRedirect(await fetch(base + page, { redirect: 'manual' }), '/login');
    }
    assert.equal((await fetch(base + '/api/profile')).status, 401);
    assert.equal((await fetch(base + '/api/admin/overview')).status, 401);
    assert.equal((await fetch(base + '/api/auth/login', { method: 'POST', headers: { origin: 'https://attacker.example', 'content-type': 'application/json' }, body: '{}' })).status, 403);
  });
  await t.test('registration validates input, hashes passwords, and protects duplicate emails', async () => {
    assert.equal((await post('register', { ...account, passwordConfirmation: 'mismatch' })).status, 400);
    assert.equal((await post('login', { email: { $ne: null }, password: 'test' })).status, 400);
    const response = await post('register', { ...account, role: 'admin' }); assert.equal(response.status, 200);
    challenge = (await response.json()).challenge;
    const user = await User.findOne({ email: account.email }).select('+passwordHash'); assert.ok(user);
    assert.equal(user.role, 'student'); assert.notEqual(user.passwordHash, account.password); assert.match(user.passwordHash, /^\$2/);
    assert.equal(await Session.countDocuments({ userId: user._id }), 0);
    const duplicate = await post('register', account); assert.equal(duplicate.status, 200);
    assert.equal(await User.countDocuments({ email: account.email }), 1);
    const fakeChallenge = (await duplicate.json()).challenge;
    assert.equal(await VerificationCode.countDocuments({ tokenHash: hashToken(fakeChallenge) }), 0);
    const stored = await VerificationCode.findOne({ tokenHash: hashToken(challenge) }).select('+codeHash'); assert.ok(stored);
    assert.notEqual(stored.tokenHash, challenge); assert.match(stored.codeHash, /^[a-f0-9]{64}$/);
  });
  await t.test('resend respects cooldown, rotates code, and retains attempt count', async () => {
    const before = await VerificationCode.findOne({ tokenHash: hashToken(challenge) }).select('+codeHash'); assert.ok(before);
    assert.equal((await post('resend', { challenge })).status, 200);
    const unchanged = await VerificationCode.findById(before._id).select('+codeHash'); assert.equal(unchanged?.codeHash, before.codeHash);
    await VerificationCode.updateOne({ _id: before._id }, { $set: { lastSentAt: new Date(Date.now() - 61000), attempts: 1 } });
    assert.equal((await post('resend', { challenge })).status, 200);
    const updated = await VerificationCode.findById(before._id).select('+codeHash'); assert.ok(updated);
    assert.notEqual(updated.codeHash, before.codeHash); assert.equal(updated.attempts, 1);
    await setKnownCode(challenge);
  });
  await t.test('verification is single-use under concurrency; cookies are secure', async () => {
    const responses = await Promise.all([post('verify', { challenge, code: '123456', trustDevice: true }), post('verify', { challenge, code: '123456', trustDevice: true })]);
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 400]);
    const success = responses.find(response => response.status === 200)!;
    studentCookie = cookieValue(success, '__Host-ayat-session'); deviceCookie = cookieValue(success, '__Host-ayat-device');
    assert.ok(studentCookie); assert.ok(deviceCookie);
    for (const cookie of success.headers.getSetCookie()) { assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i); assert.match(cookie, /SameSite=lax/i); assert.match(cookie, /Path=\//i); }
    assert.equal((await post('verify', { challenge, code: '123456' })).status, 400);
  });
  await t.test('profile ownership and administrator authorization are enforced on server', async () => {
    const other = await User.create({ fullName: 'Other Student', email: 'other@example.com', passwordHash: await hashPassword(account.password), role: 'student' });
    const result = await fetch(base + '/api/profile', { method: 'PATCH', headers: { origin, 'content-type': 'application/json', cookie: studentCookie }, body: JSON.stringify({ fullName: 'Updated Student', role: 'admin', userId: String(other._id), email: 'changed@example.com' }) });
    assert.equal(result.status, 200);
    const profile = await fetch(base + '/api/profile', { headers: { cookie: studentCookie } }); const data = await profile.json();
    assert.equal(data.fullName, 'Updated Student'); assert.equal(data.role, 'student'); assert.equal(data.email, account.email);
    assert.equal((await User.findById(other._id))?.fullName, 'Other Student');
    assert.equal((await fetch(base + '/api/admin/overview', { headers: { cookie: studentCookie } })).status, 403);
    await assertPageRedirect(await fetch(base + '/admin', { headers: { cookie: studentCookie }, redirect: 'manual' }), '/dashboard');
    assert.equal((await fetch(base + '/dashboard', { headers: { cookie: studentCookie } })).status, 200);
  });
  await t.test('students can trust devices; new devices require a code; logout revokes session', async () => {
    const trusted = await post('login', account, deviceCookie); assert.equal(trusted.status, 200); assert.equal((await trusted.json()).redirect, '/dashboard');
    const newSession = cookieValue(trusted, '__Host-ayat-session'); assert.ok(newSession);
    const unknown = await post('login', account); assert.ok((await unknown.json()).challenge);
    assert.equal((await post('logout', {}, newSession)).status, 200);
    assert.equal((await fetch(base + '/api/profile', { headers: { cookie: newSession } })).status, 401);
  });
  await t.test('administrators always verify and cannot receive trusted-device bypass', async () => {
    const admin = await User.create({ fullName: 'Administrator', email: 'admin@example.com', passwordHash: await hashPassword(account.password), role: 'admin', emailVerifiedAt: new Date() });
    const token = newToken();
    await TrustedDevice.create({ tokenHash: hashToken(token), userId: admin._id, authVersion: 0, userAgentHash: hashToken('integration-browser'), expiresAt: new Date(Date.now() + 600000) });
    const response = await post('login', { email: admin.email, password: account.password }, `__Host-ayat-device=${token}`);
    const { challenge: adminChallenge } = await response.json(); assert.ok(adminChallenge); assert.equal(response.headers.getSetCookie().length, 0);
    await setKnownCode(adminChallenge);
    const verified = await post('verify', { challenge: adminChallenge, code: '123456', trustDevice: true }); assert.equal(verified.status, 200);
    assert.equal(cookieValue(verified, '__Host-ayat-device'), '');
    adminCookie = cookieValue(verified, '__Host-ayat-session');
    assert.equal((await fetch(base + '/api/admin/overview', { headers: { cookie: adminCookie } })).status, 200);
    assert.equal((await fetch(base + '/admin', { headers: { cookie: adminCookie } })).status, 200);
    const session = await Session.findOne({ userId: admin._id }); assert.ok(session); assert.ok(session.expiresAt.getTime() - Date.now() <= 3600000);
  });
  await t.test('Phase 2 course administration is admin-only and preserves hierarchy integrity', async () => {
    assert.ok(adminCookie);

    const studentCreate = await fetch(base + '/api/admin/courses', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', cookie: studentCookie },
      body: JSON.stringify({ title: 'Blocked Course', slug: 'blocked-course', priceMinor: 10000, currency: 'USD' }),
    });
    assert.equal(studentCreate.status, 403);

    const anonymousList = await fetch(base + '/api/admin/courses');
    assert.equal(anonymousList.status, 401);

    const createCourse = await fetch(base + '/api/admin/courses', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({
        title: 'Professional Skincare',
        slug: 'professional-skincare',
        shortDescription: 'Professional training',
        priceMinor: 30000,
        salePriceMinor: 10000,
        currency: 'USD',
        published: false,
        featured: true,
        requirements: ['Basic skincare interest'],
        learningOutcomes: ['Analyze skin'],
        instructorName: 'Ayat',
        instructorBio: 'Skincare specialist',
        estimatedMinutes: 600,
        certificateEnabled: true,
        order: 0,
      }),
    });
    assert.equal(createCourse.status, 201);
    const createdCourse = await createCourse.json();
    const courseId = createdCourse.course.id as string;

    const duplicateSlug = await fetch(base + '/api/admin/courses', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ title: 'Duplicate', slug: 'professional-skincare', priceMinor: 1000, currency: 'USD' }),
    });
    assert.equal(duplicateSlug.status, 409);

    async function content(body: object) {
      return fetch(base + '/api/admin/courses/' + courseId + '/content', {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json', cookie: adminCookie },
        body: JSON.stringify(body),
      });
    }

    const levelOneResponse = await content({ action: 'createLevel', data: { title: 'Skin Fundamentals', description: '', published: true, order: 0 } });
    assert.equal(levelOneResponse.status, 201);
    const levelOne = (await levelOneResponse.json()).item;
    const levelTwoResponse = await content({ action: 'createLevel', data: { title: 'Advanced Skin', description: '', published: false, order: 1 } });
    assert.equal(levelTwoResponse.status, 201);
    const levelTwo = (await levelTwoResponse.json()).item;

    const sectionOneResponse = await content({ action: 'createSection', data: { levelId: levelOne._id, title: 'Skin Types', description: '', published: true, order: 0 } });
    assert.equal(sectionOneResponse.status, 201);
    const sectionOne = (await sectionOneResponse.json()).item;
    const sectionTwoResponse = await content({ action: 'createSection', data: { levelId: levelOne._id, title: 'Skin Structure', description: '', published: false, order: 1 } });
    assert.equal(sectionTwoResponse.status, 201);
    const sectionTwo = (await sectionTwoResponse.json()).item;

    const forgedSection = await content({ action: 'createSection', data: { levelId: new mongoose.Types.ObjectId().toString(), title: 'Forged', description: '', published: false, order: 0 } });
    assert.equal(forgedSection.status, 400);

    const lessonOneResponse = await content({ action: 'createLesson', data: {
      levelId: levelOne._id, sectionId: sectionOne._id, title: 'Understanding Skin Types', description: '',
      content: '**Safe markdown**', videoAssetId: '', durationSeconds: 300, preview: true, published: true, required: true, order: 0,
      resources: [{ title: 'Worksheet', privateAssetId: 'local-dev:resource:worksheet.pdf' }],
    } });
    assert.equal(lessonOneResponse.status, 201);
    const lessonOne = (await lessonOneResponse.json()).item;

    const lessonTwoResponse = await content({ action: 'createLesson', data: {
      levelId: levelOne._id, sectionId: sectionOne._id, title: 'Second Lesson', description: '',
      content: '', videoAssetId: '', durationSeconds: null, preview: false, published: false, required: true, order: 1, resources: [],
    } });
    assert.equal(lessonTwoResponse.status, 201);
    const lessonTwo = (await lessonTwoResponse.json()).item;

    const forgedLesson = await content({ action: 'createLesson', data: {
      levelId: levelTwo._id, sectionId: sectionOne._id, title: 'Wrong hierarchy', description: '',
      content: '', videoAssetId: '', durationSeconds: null, preview: false, published: false, required: true, order: 0, resources: [],
    } });
    assert.equal(forgedLesson.status, 400);

    const reorderLessons = await content({ action: 'reorder', kind: 'lesson', ids: [lessonTwo._id, lessonOne._id] });
    assert.equal(reorderLessons.status, 200);
    assert.equal((await Lesson.findById(lessonTwo._id))?.order, 0);
    assert.equal((await Lesson.findById(lessonOne._id))?.order, 1);

    const crossSectionReorder = await content({ action: 'reorder', kind: 'section', ids: [sectionOne._id, sectionTwo._id] });
    assert.equal(crossSectionReorder.status, 200);
    assert.equal((await Section.findById(sectionOne._id))?.order, 0);
    assert.equal((await Section.findById(sectionTwo._id))?.order, 1);

    const patchCourse = await fetch(base + '/api/admin/courses/' + courseId, {
      method: 'PATCH',
      headers: { origin, 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ published: true, title: 'Professional Skincare Updated' }),
    });
    assert.equal(patchCourse.status, 200);
    assert.equal((await Course.findById(courseId))?.published, true);

    const duplicated = await fetch(base + '/api/admin/courses/' + courseId + '/duplicate', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', cookie: adminCookie },
      body: '{}',
    });
    assert.equal(duplicated.status, 201);
    const duplicate = (await duplicated.json()).course;
    assert.notEqual(duplicate.id, courseId);
    assert.equal(duplicate.slug, 'professional-skincare-copy');
    assert.equal((await Course.findById(duplicate.id))?.published, false);
    assert.equal(await Level.countDocuments({ courseId: duplicate.id }), 2);
    assert.equal(await Section.countDocuments({ courseId: duplicate.id }), 2);
    assert.equal(await Lesson.countDocuments({ courseId: duplicate.id }), 2);

    const deleteSection = await content({ action: 'deleteSection', id: sectionOne._id });
    assert.equal(deleteSection.status, 200);
    assert.equal(await Lesson.countDocuments({ courseId, sectionId: sectionOne._id }), 0);

    const deleteLevel = await content({ action: 'deleteLevel', id: levelOne._id });
    assert.equal(deleteLevel.status, 200);
    assert.equal(await Section.countDocuments({ courseId, levelId: levelOne._id }), 0);
    assert.equal(await Lesson.countDocuments({ courseId, levelId: levelOne._id }), 0);

    const deleteCourse = await fetch(base + '/api/admin/courses/' + courseId, {
      method: 'DELETE',
      headers: { origin, 'content-type': 'application/json', cookie: adminCookie },
      body: '{}',
    });
    assert.equal(deleteCourse.status, 200);
    assert.equal(await Course.countDocuments({ _id: courseId }), 0);
    assert.equal(await Level.countDocuments({ courseId }), 0);
    assert.equal(await Section.countDocuments({ courseId }), 0);
    assert.equal(await Lesson.countDocuments({ courseId }), 0);
  });

  await t.test('expired codes and exhausted attempts cannot authenticate', async () => {
    const user = await User.findOne({ email: account.email }); assert.ok(user);
    const expired = newToken();
    await VerificationCode.create({ tokenHash: hashToken(expired), codeHash: hashToken(`${expired}:123456`), userId: user._id, authVersion: 0, purpose: 'login', expiresAt: new Date(Date.now() - 1000) });
    assert.equal((await post('verify', { challenge: expired, code: '123456' })).status, 400);
    const limited = newToken();
    await VerificationCode.create({ tokenHash: hashToken(limited), codeHash: hashToken(`${limited}:123456`), userId: user._id, authVersion: 0, purpose: 'login', expiresAt: new Date(Date.now() + 600000) });
    for (let i = 0; i < 5; i++) assert.equal((await post('verify', { challenge: limited, code: '000000' })).status, 400);
    assert.equal((await post('verify', { challenge: limited, code: '123456' })).status, 429);
  });
  await t.test('password reset is generic, expires, is single-use, and revokes sessions/devices', async () => {
    const known = await post('forgot', { email: account.email }); const unknown = await post('forgot', { email: 'nobody@example.com' });
    assert.equal(known.status, unknown.status); assert.deepEqual(await known.json(), await unknown.json());
    const user = await User.findOne({ email: account.email }); assert.ok(user);
    const expired = newToken();
    await VerificationCode.create({ tokenHash: hashToken(expired), codeHash: hashToken(`${expired}:${expired}`), userId: user._id, purpose: 'reset', authVersion: 0, expiresAt: new Date(Date.now() - 1000) });
    const input = { password: 'A completely new password!', passwordConfirmation: 'A completely new password!' };
    assert.equal((await post('reset', { ...input, token: expired })).status, 400);
    const token = newToken();
    await VerificationCode.create({ tokenHash: hashToken(token), codeHash: hashToken(`${token}:${token}`), userId: user._id, purpose: 'reset', authVersion: 0, expiresAt: new Date(Date.now() + 600000) });
    assert.equal((await post('reset', { ...input, token })).status, 200);
    assert.equal((await post('reset', { ...input, token })).status, 400);
    assert.equal(await Session.countDocuments({ userId: user._id }), 0); assert.equal(await TrustedDevice.countDocuments({ userId: user._id }), 0);
    assert.equal((await fetch(base + '/api/profile', { headers: { cookie: studentCookie } })).status, 401);
    assert.equal((await post('login', account)).status, 401);
    const login = await post('login', { email: account.email, password: input.password }, deviceCookie); assert.ok((await login.json()).challenge);
  });
  await t.test('session expiry, auth version, and role changes revoke access', async () => {
    const user = await User.findOne({ email: account.email }); assert.ok(user);
    for (const variant of [
      { expiresAt: new Date(Date.now() - 1000), authVersion: user.authVersion, role: 'student' },
      { expiresAt: new Date(Date.now() + 600000), authVersion: user.authVersion - 1, role: 'student' },
      { expiresAt: new Date(Date.now() + 600000), authVersion: user.authVersion, role: 'admin' },
    ] as const) {
      const token = newToken(); await Session.create({ tokenHash: hashToken(token), userId: user._id, ...variant });
      assert.equal((await fetch(base + '/api/profile', { headers: { cookie: `__Host-ayat-session=${token}` } })).status, 401);
    }
  });
  await t.test('database rate limits are atomic and course access cannot be duplicated', async () => {
    const attempts = await Promise.allSettled(Array.from({ length: 6 }, () => rateLimit('concurrency-test', 2)));
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 2);
    const userId = new mongoose.Types.ObjectId(); const courseId = new mongoose.Types.ObjectId();
    const enrollments = await Promise.allSettled([Enrollment.create({ userId, courseId, source: 'admin' }), Enrollment.create({ userId, courseId, source: 'admin' })]);
    assert.equal(enrollments.filter(result => result.status === 'fulfilled').length, 1);
  });
});

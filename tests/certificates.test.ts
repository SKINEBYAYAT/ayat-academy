import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/lib/db/models/auth';
import { Course, CourseProgress } from '../src/lib/db/models/courses';
import { Certificate } from '../src/lib/db/models/commerce';
import { ensureCertificateForCompletion } from '../src/lib/certificates/service';

test('completed certificate-enabled courses issue exactly one certificate', { timeout: 120000 }, async t => {
  const mongo = await MongoMemoryServer.create();
  t.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Course.init(), CourseProgress.init(), Certificate.init()]);

  const user = await User.create({
    fullName: 'Test Student',
    email: 'certificate@example.com',
    passwordHash: 'not-used-in-this-test',
    role: 'student',
    emailVerifiedAt: new Date(),
  });
  const course = await Course.create({
    title: 'Professional Skincare',
    slug: 'professional-skincare-certificate',
    priceMinor: 10000,
    currency: 'USD',
    published: true,
    certificateEnabled: true,
  });
  const completedAt = new Date('2026-09-26T12:00:00Z');
  await CourseProgress.create({ userId: user._id, courseId: course._id, completedAt });

  const first = await ensureCertificateForCompletion(user._id, course._id);
  const second = await ensureCertificateForCompletion(user._id, course._id);

  assert.ok(first);
  assert.equal(first?.certificateId, second?.certificateId);
  assert.match(first!.certificateId, /^AYAT-[A-F0-9]{20}$/);
  assert.equal(first?.studentName, 'Test Student');
  assert.equal(first?.courseName, 'Professional Skincare');
  assert.equal(await Certificate.countDocuments({ userId: user._id, courseId: course._id }), 1);
});

test('certificate-disabled courses do not issue certificates', { timeout: 120000 }, async t => {
  const mongo = await MongoMemoryServer.create();
  t.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  await mongoose.connect(mongo.getUri());

  const user = await User.create({
    fullName: 'No Certificate',
    email: 'nocert@example.com',
    passwordHash: 'not-used-in-this-test',
    role: 'student',
    emailVerifiedAt: new Date(),
  });
  const course = await Course.create({
    title: 'No Certificate Course',
    slug: 'no-certificate-course',
    priceMinor: 0,
    currency: 'USD',
    published: true,
    certificateEnabled: false,
  });
  await CourseProgress.create({ userId: user._id, courseId: course._id, completedAt: new Date() });

  const result = await ensureCertificateForCompletion(user._id, course._id);
  assert.equal(result, null);
});

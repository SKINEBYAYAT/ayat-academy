import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Course, Enrollment } from '../src/lib/db/models/courses';
import { Order } from '../src/lib/db/models/commerce';
import { createOrReuseOrder, effectiveCoursePrice, markOrderPaidFromVerifiedProvider } from '../src/lib/commerce/orders';

test('effective price prefers sale price including zero', () => {
  assert.equal(effectiveCoursePrice({ priceMinor: 30000, salePriceMinor: 10000 }), 10000);
  assert.equal(effectiveCoursePrice({ priceMinor: 30000, salePriceMinor: 0 }), 0);
  assert.equal(effectiveCoursePrice({ priceMinor: 30000 }), 30000);
});

test('Phase 4 orders do not grant paid access until verified payment', { timeout: 120000 }, async t => {
  const mongo = await MongoMemoryServer.create();
  t.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  await mongoose.connect(mongo.getUri());
  await Promise.all([Course.init(), Enrollment.init(), Order.init()]);

  const userId = new mongoose.Types.ObjectId();
  const course = await Course.create({
    title: 'Paid Course',
    slug: 'paid-course',
    priceMinor: 30000,
    salePriceMinor: 10000,
    currency: 'USD',
    published: true,
  });

  const first = await createOrReuseOrder(userId, String(course._id), 'whish');
  assert.equal(first.alreadyOwned, false);
  assert.ok(first.order);
  assert.equal(first.order?.amountMinor, 10000);
  assert.equal(first.order?.paymentStatus, 'pending');
  assert.equal(await Enrollment.countDocuments({ userId, courseId: course._id, active: true }), 0);

  const second = await createOrReuseOrder(userId, String(course._id), 'whish');
  assert.equal(String(second.order?._id), String(first.order?._id));
  assert.equal(await Order.countDocuments({ userId, courseId: course._id, paymentMethod: 'whish' }), 1);

  await markOrderPaidFromVerifiedProvider(first.order!._id, 'verified-provider-transaction');
  assert.equal((await Order.findById(first.order!._id))?.paymentStatus, 'paid');
  assert.equal(await Enrollment.countDocuments({ userId, courseId: course._id, active: true, source: 'purchase' }), 1);

  const owned = await createOrReuseOrder(userId, String(course._id), 'card');
  assert.equal(owned.alreadyOwned, true);
  assert.equal(owned.order, null);
});

test('free published courses enroll immediately through a paid zero-value order', { timeout: 120000 }, async t => {
  const mongo = await MongoMemoryServer.create();
  t.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  await mongoose.connect(mongo.getUri());

  const userId = new mongoose.Types.ObjectId();
  const course = await Course.create({
    title: 'Free Course',
    slug: 'free-course',
    priceMinor: 0,
    currency: 'USD',
    published: true,
  });

  const result = await createOrReuseOrder(userId, String(course._id), 'card');
  assert.equal(result.order?.paymentStatus, 'paid');
  assert.equal(await Enrollment.countDocuments({ userId, courseId: course._id, active: true, source: 'purchase' }), 1);
});

import 'server-only';

import mongoose from 'mongoose';
import { Course, Enrollment } from '@/lib/db/models/courses';
import { Order } from '@/lib/db/models/commerce';
import { HttpError } from '@/lib/http';

export function effectiveCoursePrice(course: { priceMinor: number; salePriceMinor?: number | null }) {
  return course.salePriceMinor != null ? course.salePriceMinor : course.priceMinor;
}


export async function enrollFreeCourse(
  userId: mongoose.Types.ObjectId,
  courseId: string,
) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) throw new HttpError(404, 'Course not found.');

  const course = await Course.findOne({ _id: courseId, published: true });
  if (!course) throw new HttpError(404, 'Course not found.');

  if (effectiveCoursePrice(course) !== 0) {
    throw new HttpError(409, 'This course is not free.');
  }

  await Enrollment.findOneAndUpdate(
    { userId, courseId: course._id },
    {
      $set: { active: true, source: 'purchase' },
      $unset: { expiresAt: 1, grantedBy: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { course };
}

export async function createOrReuseOrder(
  userId: mongoose.Types.ObjectId,
  courseId: string,
  paymentMethod: 'whish' | 'card' | 'usdt',
) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) throw new HttpError(404, 'Course not found.');

  const course = await Course.findOne({ _id: courseId, published: true });
  if (!course) throw new HttpError(404, 'Course not found.');

  const existingEnrollment = await Enrollment.findOne({
    userId,
    courseId: course._id,
    active: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });
  if (existingEnrollment) {
    return { alreadyOwned: true, course, order: null };
  }

  const amountMinor = effectiveCoursePrice(course);

  if (amountMinor === 0) {
    const order = await Order.create({
      userId,
      courseId: course._id,
      amountMinor: 0,
      currency: course.currency,
      paymentMethod,
      paymentStatus: 'paid',
      paidAt: new Date(),
    });
    await activateEnrollmentFromPaidOrder(order._id);
    return { alreadyOwned: false, course, order };
  }

  const reusable = await Order.findOne({
    userId,
    courseId: course._id,
    paymentMethod,
    paymentStatus: { $in: ['pending', 'awaiting_verification'] },
  }).sort({ createdAt: -1 });

  if (reusable) {
    if (reusable.amountMinor !== amountMinor || reusable.currency !== course.currency) {
      reusable.amountMinor = amountMinor;
      reusable.currency = course.currency;
      await reusable.save();
    }
    return { alreadyOwned: false, course, order: reusable };
  }

  const order = await Order.create({
    userId,
    courseId: course._id,
    amountMinor,
    currency: course.currency,
    paymentMethod,
    paymentStatus: 'pending',
  });

  return { alreadyOwned: false, course, order };
}

export async function activateEnrollmentFromPaidOrder(orderId: mongoose.Types.ObjectId | string) {
  const order = await Order.findById(orderId);
  if (!order) throw new HttpError(404, 'Order not found.');
  if (order.paymentStatus !== 'paid') throw new HttpError(409, 'Order is not paid.');

  await Enrollment.findOneAndUpdate(
    { userId: order.userId, courseId: order.courseId },
    {
      $set: { active: true, source: 'purchase' },
      $unset: { expiresAt: 1, grantedBy: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return order;
}

export async function markOrderPaidFromVerifiedProvider(
  orderId: mongoose.Types.ObjectId | string,
  providerTransactionId: string,
) {
  const order = await Order.findById(orderId);
  if (!order) throw new HttpError(404, 'Order not found.');

  if (order.paymentStatus === 'paid') {
    await activateEnrollmentFromPaidOrder(order._id);
    return order;
  }

  order.paymentStatus = 'paid';
  order.providerTransactionId = providerTransactionId;
  order.paidAt = new Date();
  await order.save();
  await activateEnrollmentFromPaidOrder(order._id);
  return order;
}

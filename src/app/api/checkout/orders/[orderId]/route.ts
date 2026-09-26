import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requireUser } from '@/lib/auth/session';
import { Course } from '@/lib/db/models/courses';
import { Order } from '@/lib/db/models/commerce';
import { errorResponse, HttpError } from '@/lib/http';

export async function GET(_: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await requireUser();
    const { orderId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) throw new HttpError(404, 'Order not found.');

    const order = await Order.findOne({ _id: orderId, userId: user._id }).lean();
    if (!order) throw new HttpError(404, 'Order not found.');

    const course = await Course.findById(order.courseId).select('title slug thumbnail').lean();
    if (!course) throw new HttpError(404, 'Course not found.');

    return NextResponse.json({
      order: {
        id: String(order._id),
        amountMinor: order.amountMinor,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
      course: {
        title: course.title,
        slug: course.slug,
        thumbnail: course.thumbnail,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

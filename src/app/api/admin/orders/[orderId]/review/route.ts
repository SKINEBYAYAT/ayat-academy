import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { Order, Payment } from '@/lib/db/models/commerce';
import { activateEnrollmentFromPaidOrder } from '@/lib/commerce/orders';
import { errorResponse, HttpError, readJson, sameOrigin } from '@/lib/http';

const schema = z.object({ action: z.enum(['approve', 'reject']) });

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    sameOrigin(request);
    const admin = await requireUser(true);
    const { orderId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) throw new HttpError(404, 'Order not found.');

    const input = schema.parse(await readJson(request));
    const order = await Order.findById(orderId);
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.paymentMethod !== 'usdt') throw new HttpError(409, 'Manual review is only available for USDT orders.');
    if (order.paymentStatus !== 'awaiting_verification') throw new HttpError(409, 'This order is not awaiting verification.');
    if (!order.transactionHash) throw new HttpError(409, 'No transaction hash was submitted.');

    if (input.action === 'reject') {
      order.paymentStatus = 'rejected';
      await order.save();
      return NextResponse.json({ message: 'USDT payment rejected.' });
    }

    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    order.providerTransactionId = order.transactionHash;
    await order.save();

    try {
      await Payment.create({
        orderId: order._id,
        provider: 'usdt-manual',
        eventId: order.transactionHash,
        status: 'paid',
        verifiedAt: new Date(),
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }

    await activateEnrollmentFromPaidOrder(order._id);

    return NextResponse.json({
      message: 'USDT payment approved and course access granted.',
      reviewedBy: String(admin._id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

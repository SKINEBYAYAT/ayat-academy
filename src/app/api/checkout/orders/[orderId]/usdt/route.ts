import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { AdminSettings, Order } from '@/lib/db/models/commerce';
import { errorResponse, HttpError, readJson, sameOrigin } from '@/lib/http';

const schema = z.object({
  transactionHash: z.string().trim().min(20).max(200).regex(/^[A-Za-z0-9_-]+$/, 'Invalid transaction hash.'),
});

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const { orderId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) throw new HttpError(404, 'Order not found.');

    const input = schema.parse(await readJson(request));
    const order = await Order.findOne({ _id: orderId, userId: user._id });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.paymentMethod !== 'usdt') throw new HttpError(409, 'This order does not use USDT.');
    if (order.paymentStatus === 'paid') throw new HttpError(409, 'This order is already paid.');
    if (!['pending', 'rejected', 'failed'].includes(order.paymentStatus)) throw new HttpError(409, 'This order is already awaiting verification.');

    const duplicate = await Order.exists({
      _id: { $ne: order._id },
      paymentMethod: 'usdt',
      transactionHash: input.transactionHash,
      paymentStatus: { $in: ['awaiting_verification', 'paid'] },
    });
    if (duplicate) throw new HttpError(409, 'This transaction hash has already been submitted.');

    const settings = await AdminSettings.findOne({ key: 'business' });
    if (!settings?.usdtWallet || !settings.usdtNetwork) throw new HttpError(503, 'USDT payments are not configured.');

    order.transactionHash = input.transactionHash;
    order.network = settings.usdtNetwork;
    order.walletAddress = settings.usdtWallet;
    order.paymentStatus = 'awaiting_verification';
    await order.save();

    return NextResponse.json({ message: 'Transaction submitted for verification.' });
  } catch (error) {
    return errorResponse(error);
  }
}

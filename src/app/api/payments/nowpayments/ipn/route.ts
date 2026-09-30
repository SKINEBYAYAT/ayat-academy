import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Enrollment } from '@/lib/db/models/courses';
import { Order, Payment } from '@/lib/db/models/commerce';
import { markOrderPaidFromVerifiedProvider } from '@/lib/commerce/orders';
import { verifyNowPaymentsIpn } from '@/lib/commerce/nowpayments';

export const dynamic = 'force-dynamic';

type IpnPayload = Record<string, unknown> & {
  payment_id?: string | number;
  payment_status?: string;
  price_amount?: string | number;
  price_currency?: string;
  pay_currency?: string;
  order_id?: string;
};

function validAmount(value: unknown, expectedMinor: number) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && Math.round(amount * 100) === expectedMinor;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!raw || raw.length > 64_000) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });

  let payload: IpnPayload;
  try {
    payload = JSON.parse(raw) as IpnPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const signature = request.headers.get('x-nowpayments-sig');
  if (!verifyNowPaymentsIpn(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const orderId = typeof payload.order_id === 'string' ? payload.order_id : '';
  const paymentId = payload.payment_id == null ? '' : String(payload.payment_id);
  const status = typeof payload.payment_status === 'string' ? payload.payment_status.toLowerCase() : '';

  if (!mongoose.Types.ObjectId.isValid(orderId) || !paymentId || !status) {
    return NextResponse.json({ error: 'Invalid payment notification.' }, { status: 400 });
  }

  await connectDB();
  const order = await Order.findById(orderId);
  if (!order || order.paymentMethod !== 'usdt') {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const amountMatches = validAmount(payload.price_amount, order.amountMinor);
  const currencyMatches = String(payload.price_currency ?? '').toUpperCase() === order.currency.toUpperCase();
  const assetMatches = String(payload.pay_currency ?? '').toLowerCase() === 'usdtbsc';

  if (!amountMatches || !currencyMatches || !assetMatches) {
    order.providerStatus = 'mismatch_' + status;
    if (order.paymentStatus !== 'paid') order.paymentStatus = 'rejected';
    await order.save();
    return NextResponse.json({ error: 'Payment does not match the order.' }, { status: 409 });
  }

  order.providerStatus = status;

  if (status === 'finished') {
    await markOrderPaidFromVerifiedProvider(order._id, paymentId);
  } else if (status === 'refunded') {
    order.paymentStatus = 'refunded';
    await order.save();
    await Enrollment.updateOne(
      { userId: order.userId, courseId: order.courseId },
      { $set: { active: false } },
    );
  } else if (['failed', 'expired'].includes(status)) {
    if (order.paymentStatus !== 'paid') order.paymentStatus = 'failed';
    await order.save();
  } else if (['confirming', 'confirmed', 'sending', 'partially_paid'].includes(status)) {
    if (order.paymentStatus !== 'paid') order.paymentStatus = 'awaiting_verification';
    await order.save();
  } else {
    await order.save();
  }

  try {
    await Payment.create({
      orderId: order._id,
      provider: 'nowpayments',
      eventId: paymentId + ':' + status,
      status,
      verifiedAt: new Date(),
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }

  return NextResponse.json({ ok: true });
}

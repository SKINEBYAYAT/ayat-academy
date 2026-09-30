import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requireUser } from '@/lib/auth/session';
import { Order } from '@/lib/db/models/commerce';
import { Course } from '@/lib/db/models/courses';
import { createNowPaymentsInvoice, hasNowPaymentsConfig } from '@/lib/commerce/nowpayments';
import { errorResponse, HttpError, sameOrigin } from '@/lib/http';

function publicOrigin(request: Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:') return url.origin;
    } catch {}
  }
  const url = new URL(request.url);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new HttpError(503, 'Application URL is not configured correctly.');
  }
  return url.origin;
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const { orderId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) throw new HttpError(404, 'Order not found.');
    if (!hasNowPaymentsConfig()) throw new HttpError(503, 'Crypto payments are not configured.');

    const order = await Order.findOne({ _id: orderId, userId: user._id });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.paymentMethod !== 'usdt') throw new HttpError(409, 'This order does not use crypto payment.');
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ paid: true, redirect: '/dashboard' });
    }
    if (order.paymentStatus === 'refunded') throw new HttpError(409, 'This order was refunded.');
    if (order.currency.toUpperCase() !== 'USD') {
      throw new HttpError(409, 'Crypto checkout currently supports USD-priced courses only.');
    }

    if (order.providerCheckoutUrl && order.providerInvoiceId) {
      return NextResponse.json({ checkoutUrl: order.providerCheckoutUrl });
    }

    const course = await Course.findById(order.courseId).select('title slug').lean();
    if (!course) throw new HttpError(404, 'Course not found.');

    const origin = publicOrigin(request);
    const invoice = await createNowPaymentsInvoice({
      amount: order.amountMinor / 100,
      currency: order.currency,
      orderId: String(order._id),
      description: 'Ayat Academy - ' + course.title,
      callbackUrl: origin + '/api/payments/nowpayments/ipn',
      successUrl: origin + '/checkout/order/' + order._id,
      cancelUrl: origin + '/checkout/order/' + order._id,
    });

    order.providerInvoiceId = invoice.invoiceId;
    order.providerCheckoutUrl = invoice.invoiceUrl;
    order.providerStatus = 'invoice_created';
    order.network = 'BEP20';
    await order.save();

    return NextResponse.json({ checkoutUrl: invoice.invoiceUrl });
  } catch (error) {
    return errorResponse(error);
  }
}

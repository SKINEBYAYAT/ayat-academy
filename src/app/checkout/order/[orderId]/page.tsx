import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound, redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { Order } from '@/lib/db/models/commerce';
import { Course } from '@/lib/db/models/courses';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requirePageUser();
  const { orderId } = await params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) notFound();

  const order = await Order.findOne({ _id: orderId, userId: user._id }).lean();
  if (!order) notFound();

  const course = await Course.findById(order.courseId).lean();
  if (!course) notFound();

  if (order.paymentStatus === 'paid') redirect('/learn/' + course.slug);

  const statusCopy: Record<string, string> = {
    pending: 'Your order was created. Payment still needs to be completed and verified.',
    awaiting_verification: 'Your payment was submitted and is waiting for verification.',
    failed: 'The payment did not complete. You can return to checkout and try again.',
    rejected: 'The submitted payment could not be verified.',
    refunded: 'This order was refunded.',
  };

  return <section className="order-page">
    <div className="panel order-card">
      <span className="eyebrow">Order created</span>
      <h1>{course.title}</h1>
      <div className="order-status"><span className="status-badge">{order.paymentStatus.replaceAll('_', ' ')}</span></div>
      <p>{statusCopy[order.paymentStatus] || 'Your order is being processed.'}</p>

      <dl className="order-details">
        <dt>Order ID</dt><dd>{String(order._id)}</dd>
        <dt>Payment method</dt><dd>{order.paymentMethod.toUpperCase()}</dd>
        <dt>Amount</dt><dd>{(order.amountMinor / 100).toFixed(2)} {order.currency}</dd>
      </dl>

      <div className="notice">
        Phase 4 creates and protects the order, but it never fakes a successful payment. Whish, card, and USDT payment execution/verification are connected in Phase 5.
      </div>

      <div className="actions">
        <Link className="button secondary" href={'/checkout/' + course.slug}>Change payment method</Link>
        <Link className="button secondary" href="/dashboard">My dashboard</Link>
      </div>
    </div>
  </section>;
}

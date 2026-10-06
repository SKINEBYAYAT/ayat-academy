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

  const amountLabel = (order.amountMinor / 100).toFixed(2) + ' ' + order.currency;

  return <section className="order-page">
    <div className="panel order-card">
      <span className="eyebrow">Payment</span>
      <h1>{course.title}</h1>
      <div className="order-status"><span className="status-badge">{order.paymentStatus.replaceAll('_', ' ')}</span></div>
      <p>This payment option is no longer available. Return to checkout to use an available payment method.</p>

      <dl className="order-details">
        <dt>Order ID</dt><dd>{String(order._id)}</dd>
        <dt>Amount</dt><dd>{amountLabel}</dd>
      </dl>

      <div className="actions">
        <Link className="button secondary" href={'/checkout/' + course.slug}>Return to checkout</Link>
        <Link className="button secondary" href="/dashboard">My dashboard</Link>
      </div>
    </div>
  </section>;
}

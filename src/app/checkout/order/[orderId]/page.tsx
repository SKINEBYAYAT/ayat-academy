import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound, redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { Order } from '@/lib/db/models/commerce';
import { Course } from '@/lib/db/models/courses';
import { getPaymentMethodState } from '@/lib/commerce/payment-methods';
import { UsdtSubmitForm } from '@/components/commerce/usdt-submit-form';

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

  const methods = await getPaymentMethodState();

  const statusCopy: Record<string, string> = {
    pending: 'Your order was created. Complete the payment below.',
    awaiting_verification: 'Your crypto payment is being confirmed automatically.',
    failed: 'The payment did not complete. You can open the checkout and try again.',
    rejected: 'The payment was not completed for the required amount.',
    refunded: 'This order was refunded.',
  };

  return <section className="order-page">
    <div className="panel order-card">
      <span className="eyebrow">Payment</span>
      <h1>{course.title}</h1>
      <div className="order-status"><span className="status-badge">{order.paymentStatus.replaceAll('_', ' ')}</span></div>
      <p>{statusCopy[order.paymentStatus] || 'Your order is being processed.'}</p>

      <dl className="order-details">
        <dt>Order ID</dt><dd>{String(order._id)}</dd>
        <dt>Payment method</dt><dd>{order.paymentMethod === 'usdt' ? 'Crypto wallet' : order.paymentMethod.toUpperCase()}</dd>
        <dt>Amount</dt><dd>{(order.amountMinor / 100).toFixed(2)} {order.currency}</dd>
        {order.providerStatus && <><dt>Provider status</dt><dd>{order.providerStatus.replaceAll('_', ' ')}</dd></>}
      </dl>

      {order.paymentMethod === 'usdt' && methods.usdt.enabled && order.paymentStatus !== 'refunded' && <section className="usdt-payment-box">
        <span className="eyebrow">USDT · BNB Smart Chain</span>
        <h2>Pay with your crypto wallet</h2>
        <p>Use the secure hosted checkout to connect MetaMask or another supported Web3 wallet. Payment verification and course access are automatic.</p>
        <UsdtSubmitForm orderId={String(order._id)} />
      </section>}

      {order.paymentMethod === 'usdt' && !methods.usdt.enabled && <div className="notice error">
        Crypto checkout is temporarily unavailable.
      </div>}

      {order.paymentMethod === 'whish' && <div className="notice">
        Whish Pay is currently paused. Return to checkout and choose another available method.
      </div>}

      {order.paymentMethod === 'card' && <div className="notice error">
        Card payments are not live yet. A specific card provider must be selected and integrated before this method can safely process payments.
      </div>}

      <div className="actions">
        <Link className="button secondary" href={'/checkout/' + course.slug}>Change payment method</Link>
        <Link className="button secondary" href="/dashboard">My dashboard</Link>
      </div>
    </div>
  </section>;
}

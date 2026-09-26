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
    awaiting_verification: 'Your payment was submitted and is waiting for verification.',
    failed: 'The payment did not complete. You can return to checkout and try again.',
    rejected: 'The submitted payment could not be verified. You can submit a different transaction.',
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
        <dt>Payment method</dt><dd>{order.paymentMethod.toUpperCase()}</dd>
        <dt>Amount</dt><dd>{(order.amountMinor / 100).toFixed(2)} {order.currency}</dd>
        {order.transactionHash && <><dt>Transaction</dt><dd className="break-value">{order.transactionHash}</dd></>}
      </dl>

      {order.paymentMethod === 'usdt' && methods.usdt.enabled && ['pending', 'rejected', 'failed'].includes(order.paymentStatus) && <section className="usdt-payment-box">
        <span className="eyebrow">USDT payment</span>
        <h2>Send the exact amount</h2>
        <dl className="order-details">
          <dt>Network</dt><dd>{methods.usdt.network}</dd>
          <dt>Wallet</dt><dd className="break-value">{methods.usdt.wallet}</dd>
          <dt>Amount</dt><dd>{(order.amountMinor / 100).toFixed(2)} USDT</dd>
        </dl>
        {methods.usdt.qr && <img className="usdt-qr" src={methods.usdt.qr} alt="USDT payment QR code" />}
        {methods.usdt.instructions && <p>{methods.usdt.instructions}</p>}
        <UsdtSubmitForm orderId={String(order._id)} />
      </section>}

      {order.paymentMethod === 'usdt' && order.paymentStatus === 'awaiting_verification' && <div className="notice">
        Your transaction has been submitted. An administrator must verify it before the course unlocks.
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

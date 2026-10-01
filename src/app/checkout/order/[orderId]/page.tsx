import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound, redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { Order } from '@/lib/db/models/commerce';
import { Course } from '@/lib/db/models/courses';
import { getPaymentMethodState } from '@/lib/commerce/payment-methods';
import { usdtAtomicFromMinor } from '@/lib/commerce/bsc-usdt';
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
  const amountLabel = (order.amountMinor / 100).toFixed(2);

  const statusCopy: Record<string, string> = {
    pending: 'Connect your wallet and approve the payment below.',
    awaiting_verification: 'Your payment was sent and is being verified on BNB Smart Chain.',
    failed: 'The wallet transaction failed. You can try again.',
    rejected: 'The transaction did not match this order. You can try again.',
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
        <dt>Payment</dt><dd>USDT · BNB Smart Chain</dd>
        <dt>Amount</dt><dd>{amountLabel} USDT</dd>
      </dl>

      {order.paymentMethod === 'usdt' && methods.usdt.enabled && order.paymentStatus !== 'refunded' && <section className="usdt-payment-box">
        <span className="eyebrow">Secure wallet payment</span>
        <h2>Connect wallet & pay</h2>
        <p>Connect your preferred Web3 wallet and approve the payment, and stay on this page while Ayat Academy verifies it automatically.</p>
        <UsdtSubmitForm
          orderId={String(order._id)}
          recipient={methods.usdt.wallet!}
          amountAtomic={usdtAtomicFromMinor(order.amountMinor).toString()}
          amountLabel={amountLabel}
          existingTransactionHash={order.paymentStatus === 'awaiting_verification' ? order.transactionHash ?? null : null}
        />
      </section>}

      <div className="actions">
        <Link className="button secondary" href={'/checkout/' + course.slug}>Change payment method</Link>
        <Link className="button secondary" href="/dashboard">My dashboard</Link>
      </div>
    </div>
  </section>;
}

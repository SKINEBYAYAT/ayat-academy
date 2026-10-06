import { notFound, redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { Course, Enrollment } from '@/lib/db/models/courses';
import { CheckoutForm } from '@/components/commerce/checkout-form';
import { getPaymentMethodState } from '@/lib/commerce/payment-methods';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageUser();
  const { slug } = await params;
  const course = await Course.findOne({ slug, published: true }).lean();
  if (!course) notFound();

  const enrollment = await Enrollment.findOne({
    userId: user._id,
    courseId: course._id,
    active: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });

  if (enrollment) redirect('/learn/' + course.slug);

  const amount = course.salePriceMinor != null ? course.salePriceMinor : course.priceMinor;
  const priceLabel = amount === 0 ? 'Free' : (amount / 100).toFixed(2) + ' ' + course.currency;
  const methods = await getPaymentMethodState();

  return <section className="checkout-page">
    <div className="checkout-course-summary">
      <span className="eyebrow">Secure checkout</span>
      <h1>{course.title}</h1>
      <p>{course.shortDescription || 'Complete your enrollment to unlock this course.'}</p>
      <div className="checkout-price">
        {course.salePriceMinor != null && <del>{(course.priceMinor / 100).toFixed(2)} {course.currency}</del>}
        <strong>{priceLabel}</strong>
      </div>
    </div>

    <div className="panel checkout-panel">
      <h2>{amount === 0 ? 'Free enrollment' : 'Payment'}</h2>
      <CheckoutForm courseId={String(course._id)} priceLabel={priceLabel} isFree={amount === 0} availability={{
        card: { enabled: methods.card.enabled, reason: methods.card.reason },
      }} />
    </div>
  </section>;
}

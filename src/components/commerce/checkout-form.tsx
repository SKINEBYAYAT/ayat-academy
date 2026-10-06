'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutForm({
  courseId,
  priceLabel,
  availability,
  isFree = false,
}: {
  courseId: string;
  priceLabel: string;
  availability: {
    card: { enabled: boolean; reason: string };
  };
  isFree?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!isFree && !availability.card.enabled) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/checkout/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isFree ? { courseId } : { courseId, paymentMethod: 'card' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to create order.');
      router.push(result.redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create order.');
    } finally {
      setBusy(false);
    }
  }

  if (isFree) {
    return <div className="checkout-form">
      <div className="notice">This course is free. No payment method is required.</div>
      {error && <div className="notice error">{error}</div>}
      <button className="button checkout-submit" disabled={busy} onClick={submit}>{busy ? 'Enrolling…' : 'Enroll for free'}</button>
      <p className="checkout-note">Access is granted immediately.</p>
    </div>;
  }

  return <div className="checkout-form">
    <div className="checkout-methods">
      <label className={availability.card.enabled ? 'checkout-method selected' : 'checkout-method disabled'}>
        <input type="radio" name="payment" checked disabled={!availability.card.enabled} readOnly />
        <div><strong>Visa / Card</strong><span>{availability.card.enabled ? 'Pay securely by card.' : availability.card.reason}</span></div>
      </label>
    </div>
    {error && <div className="notice error">{error}</div>}
    {!availability.card.enabled && <div className="notice error">Online payment is not currently available. Please try again later.</div>}
    <button className="button checkout-submit" disabled={busy || !availability.card.enabled} onClick={submit}>{busy ? 'Creating order…' : 'Continue · ' + priceLabel}</button>
  </div>;
}

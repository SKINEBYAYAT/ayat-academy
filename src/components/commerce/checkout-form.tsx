'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Method = 'card' | 'usdt';

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
    usdt: { enabled: boolean };
  };
  isFree?: boolean;
}) {
  const router = useRouter();
  const firstEnabled: Method | null = availability.usdt.enabled ? 'usdt' : availability.card.enabled ? 'card' : null;
  const [method, setMethod] = useState<Method | null>(firstEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!isFree && !method) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/checkout/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isFree ? { courseId } : { courseId, paymentMethod: method }),
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

  function option(value: Method, title: string, enabled: boolean, note: string) {
    return <label className={method === value ? 'checkout-method selected' : enabled ? 'checkout-method' : 'checkout-method disabled'}>
      <input type="radio" name="payment" checked={method === value} disabled={!enabled} onChange={() => setMethod(value)} />
      <div><strong>{title}</strong><span>{note}</span></div>
    </label>;
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
      {option('card', 'Visa / Card', availability.card.enabled, availability.card.enabled ? 'Pay securely by card.' : availability.card.reason)}
      {option('usdt', 'USDT', availability.usdt.enabled, availability.usdt.enabled ? 'Send USDT and submit the transaction hash for verification.' : 'USDT is not configured yet.')}
    </div>
    {error && <div className="notice error">{error}</div>}
    {!firstEnabled && <div className="notice error">No payment method is currently available. Please try again later.</div>}
    <button className="button checkout-submit" disabled={busy || !method} onClick={submit}>{busy ? 'Creating order…' : 'Continue · ' + priceLabel}</button>
    <p className="checkout-note">Course access is granted only after a payment is verified as paid.</p>
  </div>;
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutForm({
  courseId,
  priceLabel,
}: {
  courseId: string;
  priceLabel: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<'whish' | 'card' | 'usdt'>('whish');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/checkout/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, paymentMethod: method }),
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

  return <div className="checkout-form">
    <div className="checkout-methods">
      <label className={method === 'whish' ? 'checkout-method selected' : 'checkout-method'}>
        <input type="radio" name="payment" checked={method === 'whish'} onChange={() => setMethod('whish')} />
        <div><strong>Whish Pay</strong><span>Official API integration comes in Phase 5.</span></div>
      </label>
      <label className={method === 'card' ? 'checkout-method selected' : 'checkout-method'}>
        <input type="radio" name="payment" checked={method === 'card'} onChange={() => setMethod('card')} />
        <div><strong>Visa / Card</strong><span>Card provider integration comes in Phase 5.</span></div>
      </label>
      <label className={method === 'usdt' ? 'checkout-method selected' : 'checkout-method'}>
        <input type="radio" name="payment" checked={method === 'usdt'} onChange={() => setMethod('usdt')} />
        <div><strong>USDT</strong><span>Wallet instructions and verification come in Phase 5.</span></div>
      </label>
    </div>
    {error && <div className="notice error">{error}</div>}
    <button className="button checkout-submit" disabled={busy} onClick={submit}>{busy ? 'Creating order…' : 'Continue · ' + priceLabel}</button>
    <p className="checkout-note">Creating an order never grants access by itself. Access is granted only after a payment is verified as paid.</p>
  </div>;
}

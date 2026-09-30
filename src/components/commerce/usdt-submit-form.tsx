'use client';

import { useState } from 'react';

export function UsdtSubmitForm({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function pay() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/checkout/orders/' + orderId + '/usdt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to start crypto checkout.');
      if (result.paid) {
        window.location.reload();
        return;
      }
      if (!result.checkoutUrl || typeof result.checkoutUrl !== 'string') {
        throw new Error('The payment provider did not return a checkout link.');
      }
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start crypto checkout.');
      setBusy(false);
    }
  }

  return <div className="usdt-submit">
    <div className="notice">
      Continue to the secure crypto checkout, connect MetaMask, and approve the USDT payment on BNB Smart Chain. Ayat Academy never receives your private key or recovery phrase.
    </div>
    {message && <div className="notice error">{message}</div>}
    <button className="button" type="button" disabled={busy} onClick={pay}>
      {busy ? 'Opening secure checkout…' : 'Connect wallet & pay'}
    </button>
  </div>;
}

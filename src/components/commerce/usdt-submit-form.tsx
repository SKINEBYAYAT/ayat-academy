'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UsdtSubmitForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [hash, setHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/checkout/orders/' + orderId + '/usdt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionHash: hash }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to submit transaction.');
      setMessage(result.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit transaction.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="usdt-submit">
    <label className="field">Transaction hash
      <input value={hash} onChange={e => setHash(e.target.value.trim())} placeholder="Paste the transaction hash" minLength={20} maxLength={200} />
    </label>
    {message && <div className="notice">{message}</div>}
    <button className="button" type="button" disabled={busy || hash.length < 20} onClick={submit}>{busy ? 'Submitting…' : 'Submit for verification'}</button>
  </div>;
}

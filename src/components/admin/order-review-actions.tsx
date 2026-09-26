'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OrderReviewActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function review(action: 'approve' | 'reject') {
    setBusy(action);
    setMessage('');
    try {
      const response = await fetch('/api/admin/orders/' + orderId + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to review payment.');
      setMessage(result.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to review payment.');
    } finally {
      setBusy('');
    }
  }

  return <div className="payment-review-actions">
    <button className="button small" disabled={Boolean(busy)} onClick={() => review('approve')}>{busy === 'approve' ? 'Approving…' : 'Approve payment'}</button>
    <button className="button secondary small" disabled={Boolean(busy)} onClick={() => review('reject')}>{busy === 'reject' ? 'Rejecting…' : 'Reject'}</button>
    {message && <small>{message}</small>}
  </div>;
}

'use client';

import { useState } from 'react';

export function PaymentSettingsForm({
  initial,
}: {
  initial: { usdtWallet: string; usdtNetwork: 'TRC20' | 'ERC20' | 'BEP20'; usdtQr: string; usdtInstructions: string };
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/payment-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to save settings.');
      setValue(result.settings);
      setMessage('Payment settings saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save settings.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="course-form">
    <label className="field">USDT wallet address
      <input value={value.usdtWallet} onChange={e => setValue({ ...value, usdtWallet: e.target.value })} placeholder="Wallet address" />
    </label>
    <label className="field">Network
      <select value={value.usdtNetwork} onChange={e => setValue({ ...value, usdtNetwork: e.target.value as typeof value.usdtNetwork })}>
        <option value="TRC20">TRC20</option>
        <option value="ERC20">ERC20</option>
        <option value="BEP20">BEP20</option>
      </select>
    </label>
    <label className="field">QR image URL (optional)
      <input value={value.usdtQr} onChange={e => setValue({ ...value, usdtQr: e.target.value })} placeholder="https://..." />
    </label>
    <label className="field">Instructions
      <textarea rows={5} value={value.usdtInstructions} onChange={e => setValue({ ...value, usdtInstructions: e.target.value })} placeholder="Send the exact amount, then submit the transaction hash." />
    </label>
    {message && <div className="notice">{message}</div>}
    <button className="button" type="button" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save payment settings'}</button>
  </div>;
}

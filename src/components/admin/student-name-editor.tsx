'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StudentNameEditor({ userId, fullName }: { userId: string; fullName: string }) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    if (busy || name.trim() === fullName.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/students/' + userId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to update student name.');
      setName(result.fullName);
      setMessage(result.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update student name.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="student-name-editor">
    <label className="field">
      Certificate name
      <input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={100} />
      <small>Students cannot change this themselves. Updating it here also updates their existing certificates.</small>
    </label>
    <button className="button secondary small" type="button" onClick={save} disabled={busy || name.trim() === fullName.trim()}>
      {busy ? 'Saving…' : 'Update name'}
    </button>
    {message && <p className="form-foot">{message}</p>}
  </div>;
}

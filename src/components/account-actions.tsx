'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace('/login'); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign out.'); }
    finally { setBusy(false); }
  }
  return <div><button className="button secondary small" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out ↗'}</button>{error && <p role="alert" className="notice error">{error}</p>}</div>;
}
export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: data.get('fullName') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(result.message); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update your profile.'); }
    finally { setBusy(false); }
  }
  return <form className="auth-form" onSubmit={submit}><label className="field">Full name<input name="fullName" autoComplete="name" defaultValue={name} minLength={2} maxLength={100} required /></label><button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>{message && <p role="status" className="notice">{message}</p>}{error && <p role="alert" className="notice error">{error}</p>}</form>;
}

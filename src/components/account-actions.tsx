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
  return <div><button className="button secondary small" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button>{error && <p role="alert" className="notice error">{error}</p>}</div>;
}
export function ProfileForm({ name }: { name: string }) {
  return <div className="profile-name-lock">
    <span className="field-label">Certificate name</span>
    <div className="profile-name-value">{name}</div>
    <p className="media-note">This name is locked to protect certificate authenticity. If it needs to be corrected, contact Ayat Academy and an administrator can update it for you.</p>
  </div>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePageUser } from '@/lib/auth/session';
import { ProfileForm } from '@/components/account-actions';

export const metadata: Metadata = { title: 'Your profile', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requirePageUser();

  return <section className="workspace profile-page">
    <div className="workspace-head">
      <div>
        <span className="eyebrow">Account</span>
        <h1>Your profile</h1>
        <p>Manage your personal details and account security.</p>
      </div>
      <div className="actions"><Link className="button secondary small" href="/dashboard">Back to academy</Link></div>
    </div>

    <section className="panel profile-panel">
      <dl className="account-details">
        <dt>Email address</dt><dd>{user.email}</dd>
        <dt>Account</dt><dd>{user.role === 'admin' ? 'Administrator' : 'Student'} · Email verified</dd>
      </dl>
      <ProfileForm name={user.fullName} />
      <p className="form-foot"><Link className="text-link" href="/forgot-password">Reset your password</Link></p>
    </section>
  </section>;
}

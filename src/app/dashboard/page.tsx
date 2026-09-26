import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { requirePageUser } from '@/lib/auth/session';
import { LogoutButton, ProfileForm } from '@/components/account-actions';
export const metadata: Metadata = { title: 'Your learning space' };
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const user = await requirePageUser();
  return <section className="workspace"><div className="workspace-head"><div><span className="eyebrow">Your personal academy</span><h1>Hello, {user.fullName.split(' ')[0]}.</h1><p>Good things begin with a little curiosity.</p></div><div className="actions">{user.role === 'admin' && <Link className="button secondary small" href="/admin">Administration</Link>}<LogoutButton /></div></div><div className="workspace-grid"><section className="panel"><h2>Your learning space</h2><div className="empty-state"><span className="empty-icon"><BookOpen size={28} aria-hidden="true" /></span><h3>A new chapter awaits.</h3><p>Your account is ready. Course enrollment and your learning dashboard will become available when the academy launches its courses.</p></div></section><section className="panel"><h2>Your profile</h2><dl className="account-details"><dt>Email address</dt><dd>{user.email}</dd><dt>Account</dt><dd>{user.role === 'admin' ? 'Administrator' : 'Student'} · Email verified</dd></dl><ProfileForm name={user.fullName} /><p className="form-foot"><Link className="text-link" href="/forgot-password">Reset your password</Link></p></section></div></section>;
}

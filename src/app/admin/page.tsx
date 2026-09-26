import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePageUser } from '@/lib/auth/session';
import { User } from '@/lib/db/models/auth';
import { Course } from '@/lib/db/models/courses';
import { LogoutButton } from '@/components/account-actions';
export const metadata: Metadata = { title: 'Administration' };
export const dynamic = 'force-dynamic';
export default async function Admin() {
  const user = await requirePageUser(true);
  const [students, courses] = await Promise.all([User.countDocuments({ role: 'student' }), Course.countDocuments()]);
  return <section className="workspace"><div className="workspace-head"><div><span className="eyebrow">Academy administration</span><h1>A thoughtful foundation.</h1><p>Welcome, {user.fullName}. Your administrator session expires after one hour.</p></div><LogoutButton /></div><div className="stats"><div className="panel stat"><span className="eyebrow">Student accounts</span><strong>{students}</strong></div><div className="panel stat"><span className="eyebrow">Courses in database</span><strong>{courses}</strong></div></div><section className="panel"><h2>Your academy starts here.</h2><p>Account security and administrator access are ready. Course management, payments, and enrollment tools are planned for the next phases.</p><div className="actions" style={{ marginTop: 24 }}><Link className="button secondary" href="/dashboard">Manage your profile ↗</Link></div></section></section>;
}

import Link from 'next/link';
import { requirePageUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(true);
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div><span className="eyebrow">Ayat Academy</span><h2>Admin</h2></div>
      <nav aria-label="Administration">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/courses">Courses</Link>
        <Link href="/admin/students">Students</Link>
        <span className="admin-nav-disabled">Payments · later</span>
        <span className="admin-nav-disabled">Settings · later</span>
      </nav>
      <Link className="text-link" href="/dashboard">Student dashboard</Link>
    </aside>
    <div className="admin-main">{children}</div>
  </div>;
}

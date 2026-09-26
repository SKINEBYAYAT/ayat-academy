import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePageUser } from '@/lib/auth/session';
import { User } from '@/lib/db/models/auth';
import { Course, Enrollment, CourseProgress } from '@/lib/db/models/courses';
import { Order, Certificate } from '@/lib/db/models/commerce';
import { LogoutButton } from '@/components/account-actions';
import { launchReadiness, readinessSummary } from '@/lib/launch/readiness';

export const metadata: Metadata = { title: 'Administration' };
export const dynamic = 'force-dynamic';

export default async function Admin() {
  const user = await requirePageUser(true);

  const [
    students,
    courses,
    publishedCourses,
    activeEnrollments,
    paidOrders,
    pendingOrders,
    certificates,
    completedCourses,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Course.countDocuments(),
    Course.countDocuments({ published: true }),
    Enrollment.countDocuments({
      active: true,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }),
    Order.countDocuments({ paymentStatus: 'paid' }),
    Order.countDocuments({ paymentStatus: { $in: ['pending', 'awaiting_verification'] } }),
    Certificate.countDocuments({ revokedAt: { $exists: false } }),
    CourseProgress.countDocuments({ completedAt: { $exists: true, $ne: null } }),
  ]);

  const readiness = readinessSummary(launchReadiness(process.env));

  return <section className="workspace admin-overview">
    <div className="workspace-head">
      <div>
        <span className="eyebrow">Academy administration</span>
        <h1>Welcome, {user.fullName.split(' ')[0]}.</h1>
        <p>See the academy at a glance and catch anything that still needs attention before launch.</p>
      </div>
      <div className="actions">
        <Link className="button secondary small" href="/admin/system">System check</Link>
        <LogoutButton />
      </div>
    </div>

    <div className="admin-metric-grid">
      <div className="panel stat"><span className="eyebrow">Students</span><strong>{students}</strong><small>Registered student accounts</small></div>
      <div className="panel stat"><span className="eyebrow">Courses</span><strong>{publishedCourses}/{courses}</strong><small>Published / total</small></div>
      <div className="panel stat"><span className="eyebrow">Active access</span><strong>{activeEnrollments}</strong><small>Current enrollments</small></div>
      <div className="panel stat"><span className="eyebrow">Paid orders</span><strong>{paidOrders}</strong><small>Verified purchases</small></div>
      <div className="panel stat"><span className="eyebrow">Pending payments</span><strong>{pendingOrders}</strong><small>Needs completion or review</small></div>
      <div className="panel stat"><span className="eyebrow">Certificates</span><strong>{certificates}</strong><small>Valid certificates issued</small></div>
      <div className="panel stat"><span className="eyebrow">Completions</span><strong>{completedCourses}</strong><small>Completed course progress records</small></div>
      <div className="panel stat"><span className="eyebrow">Launch readiness</span><strong>{readiness.percentage}%</strong><small>{readiness.ready}/{readiness.total} configuration checks ready</small></div>
    </div>

    <div className="admin-overview-panels">
      <section className="panel">
        <h2>Quick actions</h2>
        <div className="admin-quick-actions">
          <Link className="button secondary" href="/admin/courses">Manage courses</Link>
          <Link className="button secondary" href="/admin/students">Manage students</Link>
          <Link className="button secondary" href="/admin/payments">Review payments</Link>
          <Link className="button secondary" href="/admin/settings">Payment settings</Link>
        </div>
      </section>

      <section className="panel">
        <h2>Launch status</h2>
        <p>{readiness.allReady ? 'Core production configuration checks are ready.' : 'Some production configuration still needs attention before full launch.'}</p>
        <div className="actions" style={{ marginTop: 20 }}>
          <Link className="button" href="/admin/system">Open system check</Link>
          <Link className="button secondary" href="/dashboard">Student view</Link>
        </div>
      </section>
    </div>
  </section>;
}

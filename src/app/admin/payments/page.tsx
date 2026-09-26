import { requirePageUser } from '@/lib/auth/session';
import { Order } from '@/lib/db/models/commerce';
import { Course } from '@/lib/db/models/courses';
import { User } from '@/lib/db/models/auth';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  await requirePageUser(true);

  const orders = await Order.find().sort({ createdAt: -1 }).limit(200).lean();
  const userIds = [...new Set(orders.map(order => String(order.userId)))];
  const courseIds = [...new Set(orders.map(order => String(order.courseId)))];
  const [users, courses] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select('fullName email').lean(),
    Course.find({ _id: { $in: courseIds } }).select('title').lean(),
  ]);
  const usersById = new Map(users.map(user => [String(user._id), user]));
  const coursesById = new Map(courses.map(course => [String(course._id), course]));

  return <section className="admin-page">
    <div className="admin-page-head"><div><span className="eyebrow">Commerce</span><h1>Orders</h1><p>Review checkout orders. Payment verification actions will be added with the payment integrations in Phase 5.</p></div></div>

    {orders.length === 0 ? <div className="panel empty-state"><h3>No orders yet.</h3><p>Checkout orders will appear here.</p></div> :
      <div className="order-admin-list">{orders.map(order => {
        const student = usersById.get(String(order.userId));
        const course = coursesById.get(String(order.courseId));
        return <article className="panel order-admin-card" key={String(order._id)}>
          <div><span className="status-badge">{order.paymentStatus.replaceAll('_', ' ')}</span><h3>{course?.title || 'Course'}</h3><p>{student?.fullName || 'Student'} · {student?.email || 'Unknown email'}</p></div>
          <dl className="order-admin-details">
            <dt>Method</dt><dd>{order.paymentMethod.toUpperCase()}</dd>
            <dt>Amount</dt><dd>{(order.amountMinor / 100).toFixed(2)} {order.currency}</dd>
            <dt>Created</dt><dd>{new Date(order.createdAt).toLocaleString()}</dd>
          </dl>
        </article>;
      })}</div>}
  </section>;
}

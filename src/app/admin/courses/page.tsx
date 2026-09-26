import Link from 'next/link';
import { requirePageUser } from '@/lib/auth/session';
import { Course, Level, Section, Lesson } from '@/lib/db/models/courses';
import { CourseActions } from '@/components/admin/course-actions';

export const dynamic = 'force-dynamic';

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requirePageUser(true);
  const params = await searchParams;
  const query: Record<string, unknown> = {};
  if (params.q?.trim()) {
    const safe = params.q.trim().replace(/[.*+?^$()|[\]\\{}]/g, '\\export default async function CoursesPage() {
  await requirePageUser(true);
  const courses = await Course.find().sort({ order: 1, updatedAt: -1 }).lean();');
    query.title = { $regex: safe, $options: 'i' };
  }
  if (params.status === 'published') query.published = true;
  if (params.status === 'draft') query.published = false;
  if (params.status === 'featured') query.featured = true;
  const courses = await Course.find(query).sort({ order: 1, updatedAt: -1 }).lean();
  const ids = courses.map(c => c._id);
  const [levels, sections, lessons] = await Promise.all([
    Level.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: '$courseId', count: { $sum: 1 } } }]),
    Section.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: '$courseId', count: { $sum: 1 } } }]),
    Lesson.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: '$courseId', count: { $sum: 1 } } }]),
  ]);
  const counts = (rows: { _id: unknown; count: number }[]) => new Map(rows.map(r => [String(r._id), r.count]));
  const lc = counts(levels), sc = counts(sections), xc = counts(lessons);

  return <section className="admin-page">
    <div className="admin-page-head"><div><span className="eyebrow">Course management</span><h1>Courses</h1><p>Create and organize every level, section, and lesson from one place.</p></div><Link className="button" href="/admin/courses/new">+ New course</Link></div>
    <form className="course-filters">
      <input name="q" defaultValue={params.q ?? ''} placeholder="Search courses…" />
      <select name="status" defaultValue={params.status ?? ''}><option value="">All courses</option><option value="published">Published</option><option value="draft">Draft</option><option value="featured">Featured</option></select>
      <button className="button secondary small">Filter</button>
    </form>
    {courses.length === 0 ? <div className="panel empty-state"><h3>No courses yet.</h3><p>Create your first course and start building its content.</p><Link className="button" href="/admin/courses/new">Create course</Link></div> :
      <div className="course-list">{courses.map(course => <article className="course-admin-card" key={String(course._id)}>
        <div className="course-thumb">{course.thumbnail ? <img src={course.thumbnail} alt="" /> : <span>{course.title.slice(0,1).toUpperCase()}</span>}</div>
        <div className="course-admin-body">
          <div className="course-title-row"><div><div className="status-row"><span className={course.published ? 'status-badge published' : 'status-badge draft'}>{course.published ? 'Published' : 'Draft'}</span>{course.featured && <span className="status-badge">Featured</span>}</div><h2>{course.title}</h2><p>/course/{course.slug}</p></div><strong>{course.salePriceMinor != null ? '$' + (course.salePriceMinor/100).toFixed(2) : '$' + (course.priceMinor/100).toFixed(2)}</strong></div>
          <div className="course-meta"><span>{lc.get(String(course._id)) ?? 0} levels</span><span>{sc.get(String(course._id)) ?? 0} sections</span><span>{xc.get(String(course._id)) ?? 0} lessons</span><span>Updated {new Date(course.updatedAt).toLocaleDateString()}</span></div>
          <CourseActions id={String(course._id)} published={course.published} />
        </div>
      </article>)}</div>}
  </section>;
}

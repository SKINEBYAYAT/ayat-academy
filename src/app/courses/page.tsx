import type { Metadata } from 'next';
import Link from 'next/link';
import { Course } from '@/lib/db/models/courses';
import { connectDB } from '@/lib/db/connect';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Professional skincare courses',
  description: 'Explore Ayat Academy professional skincare courses, structured lessons, practical learning, and completion certificates.',
  alternates: { canonical: '/courses' },
  openGraph: { title: 'Professional skincare courses | Ayat Academy', description: 'Explore structured professional skincare education from Ayat Academy.', url: '/courses' },
};

export default async function CoursesPage() {
  await connectDB();
  const courses = await Course.find({ published: true }).sort({ featured: -1, order: 1, createdAt: -1 }).lean();

  return <section className="public-courses">
    <div className="public-courses-head">
      <span className="eyebrow">Ayat Academy</span>
      <h1>Professional skincare courses</h1>
      <p>Learn through structured levels, practical lessons, and guided course material.</p>
    </div>

    {courses.length === 0 ? <div className="panel empty-state"><h3>Courses are coming soon.</h3><p>Published courses will appear here.</p></div> :
      <div className="public-course-grid">{courses.map(course => {
        const price = course.salePriceMinor != null ? course.salePriceMinor : course.priceMinor;
        return <Link className="public-course-card" key={String(course._id)} href={'/course/' + course.slug}>
          <div className="public-course-cover">{course.thumbnail ? <img src={course.thumbnail} alt="" /> : <span>{course.title.slice(0, 1)}</span>}</div>
          <div className="public-course-copy">
            {course.featured && <span className="status-badge">Featured</span>}
            <h2>{course.title}</h2>
            <p>{course.shortDescription || 'Professional skincare education.'}</p>
            <div className="public-course-price">
              {course.salePriceMinor != null && <del>{(course.priceMinor / 100).toFixed(2)} {course.currency}</del>}
              <strong>{price === 0 ? 'Free' : (price / 100).toFixed(2) + ' ' + course.currency}</strong>
            </div>
          </div>
        </Link>;
      })}</div>}
  </section>;
}

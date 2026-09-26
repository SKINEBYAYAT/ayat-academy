import { notFound } from 'next/navigation';
import { Course, Enrollment, Lesson } from '@/lib/db/models/courses';
import { currentUser } from '@/lib/auth/session';
import { CheckoutButton } from '@/components/commerce/checkout-button';

export const dynamic = 'force-dynamic';

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await Course.findOne({ slug, published: true }).lean();
  if (!course) notFound();

  const user = await currentUser();
  const enrollment = user ? await Enrollment.findOne({
    userId: user._id,
    courseId: course._id,
    active: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean() : null;

  const lessonCount = await Lesson.countDocuments({ courseId: course._id, published: true });
  const price = course.salePriceMinor != null ? course.salePriceMinor : course.priceMinor;
  const courseImage = course.coverImage || course.thumbnail || '';

  return <section className="course-detail">
    <div className="course-detail-hero">
      <div>
        <span className="eyebrow">Ayat Academy course</span>
        <h1>{course.title}</h1>
        <p>{course.shortDescription || course.description || 'Professional skincare education.'}</p>
        <div className="course-detail-meta"><span>{lessonCount} lessons</span>{course.estimatedMinutes ? <span>{Math.round(course.estimatedMinutes / 60)} hours</span> : null}{course.certificateEnabled && <span>Certificate on completion</span>}</div>
        <div className="course-detail-price">{course.salePriceMinor != null && <del>{(course.priceMinor / 100).toFixed(2)} {course.currency}</del>}<strong>{price === 0 ? 'Free' : (price / 100).toFixed(2) + ' ' + course.currency}</strong></div>
        <CheckoutButton courseId={String(course._id)} slug={course.slug} signedIn={Boolean(user)} alreadyOwned={Boolean(enrollment)} />
      </div>
      <div className="course-detail-image">{courseImage ? <img src={courseImage} alt="" /> : <span>{course.title.slice(0, 1)}</span>}</div>
    </div>

    <div className="course-detail-grid">
      <section className="panel"><h2>About this course</h2><p>{course.description || course.shortDescription}</p></section>
      <section className="panel"><h2>What you’ll learn</h2>{course.learningOutcomes?.length ? <ul>{course.learningOutcomes.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>Course outcomes will be listed here.</p>}</section>
      <section className="panel"><h2>Requirements</h2>{course.requirements?.length ? <ul>{course.requirements.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>No special requirements.</p>}</section>
      <section className="panel"><h2>Instructor</h2><h3>{course.instructorName || 'Ayat'}</h3><p>{course.instructorBio || 'Professional skincare education by Ayat Academy.'}</p></section>
    </div>
  </section>;
}

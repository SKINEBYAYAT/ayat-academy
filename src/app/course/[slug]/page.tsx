import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Course, Enrollment, Lesson } from '@/lib/db/models/courses';
import { currentUser } from '@/lib/auth/session';
import { CheckoutButton } from '@/components/commerce/checkout-button';
import { CourseReview } from '@/lib/db/models/growth';
import { CourseViewTracker } from '@/components/analytics/course-view-tracker';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await Course.findOne({ slug, published: true }).lean();
  if (!course) return { title: 'Course not found', robots: { index: false, follow: false } };

  const description = course.shortDescription || course.description || 'Professional skincare education from Ayat Academy.';
  const image = course.coverImage || course.thumbnail || undefined;

  return {
    title: course.title,
    description,
    alternates: { canonical: '/course/' + course.slug },
    openGraph: {
      type: 'website',
      title: course.title + ' | Ayat Academy',
      description,
      url: '/course/' + course.slug,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: course.title + ' | Ayat Academy',
      description,
      images: image ? [image] : undefined,
    },
  };
}

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
  const reviews = await CourseReview.find({ courseId: course._id, removedAt: { $exists: false } }).sort({ createdAt: -1 }).select('rating comment studentName verifiedStudent createdAt').lean();
  const reviewAverage = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const price = course.salePriceMinor != null ? course.salePriceMinor : course.priceMinor;
  const courseImage = course.coverImage || course.thumbnail || '';
  const description = course.shortDescription || course.description || 'Professional skincare education.';
  const siteUrl = process.env.APP_URL || 'http://localhost:3000';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description,
    provider: {
      '@type': 'Organization',
      name: 'Ayat Academy',
      sameAs: siteUrl,
    },
    url: new URL('/course/' + course.slug, siteUrl).toString(),
    ...(courseImage ? { image: courseImage } : {}),
    offers: {
      '@type': 'Offer',
      price: (price / 100).toFixed(2),
      priceCurrency: course.currency,
      availability: 'https://schema.org/InStock',
      url: new URL('/course/' + course.slug, siteUrl).toString(),
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      ...(course.estimatedMinutes ? { courseWorkload: 'PT' + course.estimatedMinutes + 'M' } : {}),
    },
  };

  return <>
    <CourseViewTracker courseId={String(course._id)} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <section className="course-detail">
      <div className="course-detail-hero">
        <div>
          <span className="eyebrow">Ayat Academy course</span>
          <h1>{course.title}</h1>
          <p>{description}</p>
          <div className="course-detail-meta"><span>{lessonCount} lessons</span>{course.estimatedMinutes ? <span>{Math.round(course.estimatedMinutes / 60)} hours</span> : null}{course.certificateEnabled && <span>Certificate on completion</span>}</div>
          <div className="course-detail-price">{course.salePriceMinor != null && <del>{(course.priceMinor / 100).toFixed(2)} {course.currency}</del>}<strong>{price === 0 ? 'Free' : (price / 100).toFixed(2) + ' ' + course.currency}</strong></div>
          <CheckoutButton courseId={String(course._id)} slug={course.slug} signedIn={Boolean(user)} alreadyOwned={Boolean(enrollment)} />
        </div>
        <div className="course-detail-image">{courseImage ? <img src={courseImage} alt={course.title + ' course'} /> : <span>{course.title.slice(0, 1)}</span>}</div>
      </div>

      <div className="course-detail-grid">
        <section className="panel"><h2>About this course</h2><p>{course.description || course.shortDescription}</p></section>
        <section className="panel"><h2>What you’ll learn</h2>{course.learningOutcomes?.length ? <ul>{course.learningOutcomes.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>Course outcomes will be listed here.</p>}</section>
        <section className="panel"><h2>Requirements</h2>{course.requirements?.length ? <ul>{course.requirements.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>No special requirements.</p>}</section>
        <section className="panel"><h2>Instructor</h2><h3>{course.instructorName || 'Ayat'}</h3><p>{course.instructorBio || 'Professional skincare education by Ayat Academy.'}</p></section>
      </div>

      <section className="panel"><h2>Student reviews</h2>{reviews.length ? <><p><strong>{reviewAverage.toFixed(1)} / 5</strong> · {reviews.length} verified review{reviews.length === 1 ? '' : 's'}</p><div className="student-course-grid">{reviews.map(review => <article className="student-course-card" key={String(review._id)}><div className="student-course-copy"><div className="status-row"><span className="status-badge published">Verified Student</span><span>{review.rating} / 5</span></div><h3>{review.studentName}</h3><p>{review.comment}</p></div></article>)}</div></> : <p>No student reviews yet. Reviews can only be submitted after completing the course.</p>}</section>
    </section>
  </>;
}

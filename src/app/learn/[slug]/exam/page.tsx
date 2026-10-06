import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { CourseProgress } from '@/lib/db/models/courses';
import { getPublishedCourseTree, progressStats, requireCourseAccessBySlug } from '@/lib/learning/service';
import { HttpError } from '@/lib/http';
import { QcmExam } from '@/components/learning/qcm-exam';

export const dynamic = 'force-dynamic';

export default async function ExamPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageUser();
  const { slug } = await params;
  try {
    const course = await requireCourseAccessBySlug(user._id, slug, user.role === 'admin');
    if (!course.examEnabled) notFound();
    const tree = await getPublishedCourseTree(course._id);
    const progress = await CourseProgress.findOne({ userId: user._id, courseId: course._id });
    const stats = progressStats(tree.lessons, progress?.completedLessonIds ?? []);
    if (stats.percentage < 100) redirect('/dashboard');
    return <main className="page-shell narrow">
      <Link className="text-link" href="/dashboard">← My courses</Link>
      <div className="page-heading"><span className="eyebrow">{course.title}</span><h1>Final exam</h1><p>Complete the QCM to finish the course and unlock your certificate.</p></div>
      <QcmExam courseId={String(course._id)} />
    </main>;
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) redirect('/dashboard');
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
}

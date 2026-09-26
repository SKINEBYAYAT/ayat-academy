import { notFound, redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { getCourseProgress, getPublishedCourseTree, requireCourseAccessBySlug } from '@/lib/learning/service';
import { HttpError } from '@/lib/http';

export const dynamic = 'force-dynamic';

export default async function LearnCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageUser();
  const { slug } = await params;

  try {
    const course = await requireCourseAccessBySlug(user._id, slug, user.role === 'admin');
    const tree = await getPublishedCourseTree(course._id);
    const progress = await getCourseProgress(user._id, course._id);

    const currentId = progress?.currentLessonId ? String(progress.currentLessonId) : null;
    const currentVisible = currentId && tree.lessons.some(lesson => String(lesson._id) === currentId);
    const target = currentVisible ? currentId : tree.lessons[0] ? String(tree.lessons[0]._id) : null;

    if (!target) redirect('/dashboard');
    redirect('/learn/' + course.slug + '/' + target);
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) redirect('/dashboard');
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
}

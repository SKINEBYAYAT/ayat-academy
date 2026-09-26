import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { Course } from '@/lib/db/models/courses';
import { getCourseContent } from '@/lib/admin/course-service';
import { ContentBuilder } from '@/components/admin/content-builder';
export const dynamic = 'force-dynamic';
export default async function ContentPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requirePageUser(true);
  const { courseId } = await params;
  const course = await Course.findById(courseId).lean();
  if (!course) notFound();
  const content = await getCourseContent(courseId);
  return <section className="admin-page"><div className="admin-page-head"><div><span className="eyebrow">Courses / {course.title} / Content</span><h1>Course builder</h1><p>Build the hierarchy without fixed limits: levels → sections → lessons.</p></div><a className="button secondary" href={'/admin/courses/' + courseId + '/edit'}>Edit course details</a></div><ContentBuilder courseId={courseId} initial={JSON.parse(JSON.stringify(content))} /></section>;
}
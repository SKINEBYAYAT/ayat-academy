import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { Course } from '@/lib/db/models/courses';
import { CourseForm } from '@/components/admin/course-form';
export const dynamic = 'force-dynamic';
export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  await requirePageUser(true);
  const { courseId } = await params;
  const course = await Course.findById(courseId).lean();
  if (!course) notFound();
  return <section className="admin-page narrow"><div className="admin-page-head"><div><span className="eyebrow">Courses / Edit</span><h1>Edit {course.title}</h1><p>Update the public details and publishing settings for this course.</p></div></div><div className="panel"><CourseForm courseId={courseId} initial={JSON.parse(JSON.stringify(course))} /></div></section>;
}
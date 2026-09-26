import { requirePageUser } from '@/lib/auth/session';
import { CourseForm } from '@/components/admin/course-form';
export const dynamic = 'force-dynamic';
export default async function NewCoursePage() {
  await requirePageUser(true);
  return <section className="admin-page narrow"><div className="admin-page-head"><div><span className="eyebrow">Courses / New</span><h1>Create a course</h1><p>Start with the course information. You’ll build levels, sections, and lessons next.</p></div></div><div className="panel"><CourseForm /></div></section>;
}
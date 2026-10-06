import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { Course } from '@/lib/db/models/courses';
import { ExamQuestion } from '@/lib/db/models/exams';
import { ExamBuilder } from '@/components/admin/exam-builder';

export const dynamic = 'force-dynamic';
export default async function AdminExamPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requirePageUser(true);
  const { courseId } = await params;
  const course = await Course.findById(courseId).lean();
  if (!course) notFound();
  const questions = await ExamQuestion.find({ courseId }).sort({ order: 1, createdAt: 1 }).lean();
  return <section className="admin-page">
    <div className="admin-page-head"><div><span className="eyebrow">Courses / {course.title} / Exam</span><h1>Final QCM exam</h1><p>Students unlock this exam after completing all required lessons.</p></div><Link className="button secondary" href={'/admin/courses/'+courseId+'/content'}>Course content</Link></div>
    <ExamBuilder courseId={courseId} initialEnabled={Boolean(course.examEnabled)} initialPassPercent={course.examPassPercent ?? 70} initialRetakeDays={course.examRetakeDays ?? 15} initialQuestions={JSON.parse(JSON.stringify(questions))} />
  </section>;
}

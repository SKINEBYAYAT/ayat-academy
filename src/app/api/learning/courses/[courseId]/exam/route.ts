import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { CourseProgress } from '@/lib/db/models/courses';
import { ExamAttempt, ExamQuestion } from '@/lib/db/models/exams';
import { ensureCertificateForCompletion } from '@/lib/certificates/service';
import { getPublishedCourseTree, progressStats, requireCourseAccess } from '@/lib/learning/service';
import { errorResponse, HttpError, readJson, sameOrigin } from '@/lib/http';

const submitSchema = z.object({ answers: z.array(z.object({ questionId: z.string().regex(/^[a-f\d]{24}$/i), selectedIndex: z.number().int().min(0).max(5) })).min(1) });

export async function GET(_: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    const user = await requireUser();
    const { courseId } = await context.params;
    const course = await requireCourseAccess(user._id, courseId, user.role === 'admin');
    if (!course.examEnabled) throw new HttpError(404, 'Exam is not enabled.');
    const tree = await getPublishedCourseTree(course._id);
    const progress = await CourseProgress.findOne({ userId: user._id, courseId: course._id });
    const stats = progressStats(tree.lessons, progress?.completedLessonIds ?? []);
    if (stats.percentage < 100) throw new HttpError(403, 'Complete all required course lessons before taking the exam.');
    const latest = await ExamAttempt.findOne({ userId: user._id, courseId: course._id }).sort({ submittedAt: -1 });
    const questions = await ExamQuestion.find({ courseId: course._id, published: true }).sort({ order: 1, createdAt: 1 }).lean();
    if (!questions.length) throw new HttpError(409, 'This exam has no published questions yet.');
    return NextResponse.json({
      passPercent: course.examPassPercent ?? 70,
      retakeDays: course.examRetakeDays ?? 15,
      passed: Boolean(latest?.passed),
      nextAttemptAt: latest?.nextAttemptAt ?? null,
      questions: questions.map(q => ({ id: String(q._id), question: q.question, options: q.options })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const { courseId } = await context.params;
    const course = await requireCourseAccess(user._id, courseId, user.role === 'admin');
    if (!course.examEnabled) throw new HttpError(404, 'Exam is not enabled.');
    const tree = await getPublishedCourseTree(course._id);
    const progress = await CourseProgress.findOne({ userId: user._id, courseId: course._id });
    const stats = progressStats(tree.lessons, progress?.completedLessonIds ?? []);
    if (stats.percentage < 100) throw new HttpError(403, 'Complete the course before taking the exam.');

    const latest = await ExamAttempt.findOne({ userId: user._id, courseId: course._id }).sort({ submittedAt: -1 });
    if (latest?.passed) throw new HttpError(409, 'You already passed this exam.');
    if (latest?.nextAttemptAt && latest.nextAttemptAt > new Date()) throw new HttpError(429, 'Your retake is not available yet.');

    const input = submitSchema.parse(await readJson(request));
    const questions = await ExamQuestion.find({ courseId: course._id, published: true }).sort({ order: 1, createdAt: 1 });
    if (!questions.length) throw new HttpError(409, 'This exam has no published questions yet.');
    const answerMap = new Map(input.answers.map(a => [a.questionId, a.selectedIndex]));
    if (answerMap.size !== questions.length || questions.some(q => !answerMap.has(String(q._id)))) throw new HttpError(400, 'Answer every exam question.');

    let correct = 0;
    for (const q of questions) if (answerMap.get(String(q._id)) === q.correctIndex) correct++;
    const scorePercent = Math.round((correct / questions.length) * 100);
    const passPercent = course.examPassPercent ?? 70;
    const passed = scorePercent >= passPercent;
    const retakeDays = course.examRetakeDays ?? 15;
    const nextAttemptAt = passed ? undefined : new Date(Date.now() + retakeDays * 24 * 60 * 60 * 1000);
    await ExamAttempt.create({ userId: user._id, courseId: course._id, answers: questions.map(q => ({ questionId: q._id, selectedIndex: answerMap.get(String(q._id))! })), scorePercent, passed, nextAttemptAt });
    let certificateId: string | null = null;
    if (passed) {
      const certificate = await ensureCertificateForCompletion(user._id, course._id);
      certificateId = certificate?.certificateId ?? null;
    }
    return NextResponse.json({ passed, scorePercent, passPercent, nextAttemptAt: nextAttemptAt ?? null, certificateId });
  } catch (error) { return errorResponse(error); }
}

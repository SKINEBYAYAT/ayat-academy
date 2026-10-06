import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { Course } from '@/lib/db/models/courses';
import { ExamQuestion } from '@/lib/db/models/exams';
import { errorResponse, HttpError, readJson, sameOrigin } from '@/lib/http';

const settingsSchema = z.object({ action: z.literal('settings'), enabled: z.boolean(), passPercent: z.number().int().min(1).max(100).default(70), retakeDays: z.number().int().min(0).max(365).default(15) });
const createSchema = z.object({ action: z.literal('create'), question: z.string().trim().min(3).max(1000), options: z.array(z.string().trim().min(1).max(500)).min(2).max(6), correctIndex: z.number().int().min(0).max(5), published: z.boolean().default(true) });
const deleteSchema = z.object({ action: z.literal('delete'), id: z.string().regex(/^[a-f\d]{24}$/i) });
const inputSchema = z.discriminatedUnion('action', [settingsSchema, createSchema, deleteSchema]);

export async function GET(_: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    await requireUser(true);
    const { courseId } = await context.params;
    const course = await Course.findById(courseId).select('title examEnabled examPassPercent examRetakeDays').lean();
    if (!course) throw new HttpError(404, 'Course not found.');
    const questions = await ExamQuestion.find({ courseId }).sort({ order: 1, createdAt: 1 }).lean();
    return NextResponse.json({ course, questions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    sameOrigin(request); await requireUser(true);
    const { courseId } = await context.params;
    const course = await Course.findById(courseId);
    if (!course) throw new HttpError(404, 'Course not found.');
    const input = inputSchema.parse(await readJson(request));
    if (input.action === 'settings') {
      course.examEnabled = input.enabled; course.examPassPercent = input.passPercent; course.examRetakeDays = input.retakeDays;
      await course.save();
      return NextResponse.json({ message: 'Exam settings saved.' });
    }
    if (input.action === 'create') {
      if (input.correctIndex >= input.options.length) throw new HttpError(400, 'Correct answer is outside the options.');
      const count = await ExamQuestion.countDocuments({ courseId });
      const question = await ExamQuestion.create({ courseId, question: input.question, options: input.options, correctIndex: input.correctIndex, published: input.published, order: count });
      return NextResponse.json({ question }, { status: 201 });
    }
    const deleted = await ExamQuestion.findOneAndDelete({ _id: input.id, courseId });
    if (!deleted) throw new HttpError(404, 'Question not found.');
    return NextResponse.json({ message: 'Question deleted.' });
  } catch (error) { return errorResponse(error); }
}

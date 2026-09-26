import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireUser } from '@/lib/auth/session';
import { CourseProgress, Lesson } from '@/lib/db/models/courses';
import { getPublishedCourseTree, progressStats, requireCourseAccess } from '@/lib/learning/service';
import { errorResponse, HttpError, readJson, sameOrigin } from '@/lib/http';
import { ensureCertificateForCompletion } from '@/lib/certificates/service';

const schema = z.object({
  currentLessonId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  completedLessonId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  videoPositionSeconds: z.number().min(0).max(10_000_000).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const { courseId } = await context.params;
    const course = await requireCourseAccess(user._id, courseId, user.role === 'admin');
    const input = schema.parse(await readJson(request));

    let lessonId = input.currentLessonId ?? input.completedLessonId;
    if (!lessonId) throw new HttpError(400, 'A lesson is required.');

    const lesson = await Lesson.findOne({
      _id: lessonId,
      courseId: course._id,
      published: true,
    }).select('_id levelId sectionId');
    if (!lesson) throw new HttpError(404, 'Lesson not found.');

    const tree = await getPublishedCourseTree(course._id);
    const visible = tree.lessons.some(item => String(item._id) === String(lesson._id));
    if (!visible) throw new HttpError(404, 'Lesson not found.');

    const update: Record<string, unknown> = {
      currentLessonId: lesson._id,
      lastAccessedAt: new Date(),
    };
    const operations: Record<string, unknown> = { $set: update };

    if (input.completedLessonId) {
      operations.$addToSet = { completedLessonIds: new mongoose.Types.ObjectId(input.completedLessonId) };
    }
    if (input.videoPositionSeconds != null) {
      operations.$set = {
        ...update,
        ['videoPositions.' + String(lesson._id)]: Math.floor(input.videoPositionSeconds),
      };
    }

    const progress = await CourseProgress.findOneAndUpdate(
      { userId: user._id, courseId: course._id },
      operations,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const stats = progressStats(tree.lessons, progress.completedLessonIds ?? []);
    let certificateId: string | null = null;
    if (stats.requiredCount > 0 && stats.percentage === 100 && !progress.completedAt) {
      progress.completedAt = new Date();
      await progress.save();
    } else if (stats.percentage < 100 && progress.completedAt) {
      progress.completedAt = undefined;
      await progress.save();
    }

    if (stats.requiredCount > 0 && stats.percentage === 100 && course.certificateEnabled) {
      const certificate = await ensureCertificateForCompletion(user._id, course._id);
      certificateId = certificate?.certificateId ?? null;
    }

    return NextResponse.json({
      progress: {
        currentLessonId: progress.currentLessonId ? String(progress.currentLessonId) : null,
        completedLessonIds: (progress.completedLessonIds ?? []).map(String),
        percentage: stats.percentage,
        completedAt: progress.completedAt ?? null,
        certificateId,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

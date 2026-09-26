import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { Course, Enrollment } from '@/lib/db/models/courses';
import { User } from '@/lib/db/models/auth';
import { errorResponse, HttpError, readJson, sameOrigin } from '@/lib/http';

const schema = z.object({
  courseId: z.string().regex(/^[a-f\d]{24}$/i),
  action: z.enum(['grant', 'revoke']),
});

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    sameOrigin(request);
    const admin = await requireUser(true);
    const { userId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new HttpError(404, 'Student not found.');

    const student = await User.findOne({ _id: userId, role: 'student' });
    if (!student) throw new HttpError(404, 'Student not found.');

    const input = schema.parse(await readJson(request));
    const course = await Course.findById(input.courseId);
    if (!course) throw new HttpError(404, 'Course not found.');

    if (input.action === 'grant') {
      await Enrollment.findOneAndUpdate(
        { userId: student._id, courseId: course._id },
        { $set: { active: true, source: 'admin', grantedBy: admin._id }, $unset: { expiresAt: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return NextResponse.json({ message: 'Course access granted.' });
    }

    await Enrollment.updateOne(
      { userId: student._id, courseId: course._id },
      { $set: { active: false } },
    );
    return NextResponse.json({ message: 'Course access revoked.' });
  } catch (error) {
    return errorResponse(error);
  }
}

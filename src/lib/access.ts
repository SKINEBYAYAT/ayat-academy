import 'server-only';
import { isValidObjectId } from 'mongoose';
import { requireUser } from '@/lib/auth/session';
import { Enrollment } from '@/lib/db/models/courses';
import { HttpError } from './http';
export async function requireCourseAccess(courseId: string) {
  const user = await requireUser();
  if (!isValidObjectId(courseId)) throw new HttpError(404, 'Course not found.');
  if (user.role === 'admin') return user;
  const enrollment = await Enrollment.exists({ userId: user._id, courseId, active: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] });
  if (!enrollment) throw new HttpError(403, 'You do not have access to this course.');
  return user;
}

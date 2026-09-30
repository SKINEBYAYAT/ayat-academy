import 'server-only';

import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Certificate, AdminSettings } from '@/lib/db/models/commerce';
import { Course, CourseProgress } from '@/lib/db/models/courses';
import { User } from '@/lib/db/models/auth';
import { HttpError } from '@/lib/http';

function newCertificateId() {
  return 'AYAT-' + crypto.randomBytes(10).toString('hex').toUpperCase();
}

export function formatCertificateStudentName(value: string) {
  const cleaned = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  return cleaned.replace(/(^|[\s'-])(\p{L})/gu, (_, prefix: string, letter: string) =>
    prefix + letter.toLocaleUpperCase()
  );
}

export async function ensureCertificateForCompletion(
  userId: mongoose.Types.ObjectId,
  courseId: mongoose.Types.ObjectId | string,
) {
  const existing = await Certificate.findOne({ userId, courseId });
  if (existing) return existing;

  const [course, progress, user, settings] = await Promise.all([
    Course.findById(courseId),
    CourseProgress.findOne({ userId, courseId }),
    User.findById(userId),
    AdminSettings.findOne({ key: 'business' }),
  ]);

  if (!course || !user) throw new HttpError(404, 'Certificate data not found.');
  if (!progress?.completedAt) throw new HttpError(409, 'Course is not completed.');

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await Certificate.create({
        certificateId: newCertificateId(),
        userId,
        courseId: course._id,
        studentName: formatCertificateStudentName(user.fullName),
        courseName: course.title,
        brandName: settings?.businessName || 'Ayat Academy',
        completedAt: progress.completedAt,
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const raced = await Certificate.findOne({ userId, courseId });
      if (raced) return raced;
    }
  }

  throw new HttpError(503, 'Unable to issue certificate right now.');
}

export async function getPublicCertificate(certificateId: string) {
  if (!/^AYAT-[A-F0-9]{20}$/.test(certificateId)) return null;
  return Certificate.findOne({ certificateId }).lean();
}

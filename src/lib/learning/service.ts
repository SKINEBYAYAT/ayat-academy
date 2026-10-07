import 'server-only';

import mongoose from 'mongoose';
import { Course, CourseProgress, Enrollment, Lesson, Level, Section } from '@/lib/db/models/courses';
import { HttpError } from '@/lib/http';
import { Certificate } from '@/lib/db/models/commerce';
import { ExamAttempt } from '@/lib/db/models/exams';

function activeEnrollmentQuery(userId: mongoose.Types.ObjectId, courseId: mongoose.Types.ObjectId | string) {
  return {
    userId,
    courseId,
    active: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  };
}

export async function requireCourseAccess(userId: mongoose.Types.ObjectId, courseId: string, admin = false) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) throw new HttpError(404, 'Course not found.');
  const course = await Course.findById(courseId);
  if (!course || (!admin && !course.published)) throw new HttpError(404, 'Course not found.');

  if (!admin) {
    const enrollment = await Enrollment.findOne(activeEnrollmentQuery(userId, course._id));
    if (!enrollment) throw new HttpError(403, 'You do not have access to this course.');
  }

  return course;
}

export async function requireCourseAccessBySlug(userId: mongoose.Types.ObjectId, slug: string, admin = false) {
  const course = await Course.findOne({ slug, ...(admin ? {} : { published: true }) });
  if (!course) throw new HttpError(404, 'Course not found.');

  if (!admin) {
    const enrollment = await Enrollment.findOne(activeEnrollmentQuery(userId, course._id));
    if (!enrollment) throw new HttpError(403, 'You do not have access to this course.');
  }

  return course;
}

export async function getPublishedCourseTree(courseId: mongoose.Types.ObjectId | string) {
  const [levels, sections, lessons] = await Promise.all([
    Level.find({ courseId, published: true }).sort({ order: 1, createdAt: 1 }).lean(),
    Section.find({ courseId, published: true }).sort({ order: 1, createdAt: 1 }).lean(),
    Lesson.find({ courseId, published: true })
      .sort({ order: 1, createdAt: 1 })
      .select('+videoAssetId +resources.privateAssetId')
      .lean(),
  ]);

  const levelIds = new Set(levels.map(level => String(level._id)));
  const validSections = sections.filter(section => levelIds.has(String(section.levelId)));
  const sectionIds = new Set(validSections.map(section => String(section._id)));
  const validLessons = lessons.filter(lesson =>
    levelIds.has(String(lesson.levelId)) && sectionIds.has(String(lesson.sectionId)),
  );

  return { levels, sections: validSections, lessons: validLessons };
}

export async function getCourseProgress(userId: mongoose.Types.ObjectId, courseId: mongoose.Types.ObjectId | string) {
  return CourseProgress.findOne({ userId, courseId });
}

export function progressStats(
  lessons: Array<{ _id: unknown; required?: boolean }>,
  completedLessonIds: Array<unknown> = [],
) {
  const lessonIds = lessons.filter(lesson => lesson.required !== false).map(lesson => String(lesson._id));
  const completed = new Set(completedLessonIds.map(String));
  const completedCount = lessonIds.filter(id => completed.has(id)).length;
  const percentage = lessonIds.length === 0 ? 0 : Math.round((completedCount / lessonIds.length) * 100);
  return { lessonCount: lessonIds.length, completedCount, percentage };
}

export async function listStudentCourses(userId: mongoose.Types.ObjectId) {
  const enrollments = await Enrollment.find({
    userId,
    active: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean();

  const courseIds = enrollments.map(enrollment => enrollment.courseId);
  const courses = await Course.find({ _id: { $in: courseIds }, published: true }).sort({ order: 1, createdAt: -1 }).lean();
  const [progresses, certificates, passedExams] = await Promise.all([
    CourseProgress.find({ userId, courseId: { $in: courseIds } }).lean(),
    Certificate.find({ userId, courseId: { $in: courseIds }, revokedAt: { $exists: false } }).lean(),
    ExamAttempt.find({ userId, courseId: { $in: courseIds }, passed: true }).select('courseId').lean(),
  ]);
  const progressByCourse = new Map(progresses.map(progress => [String(progress.courseId), progress]));
  const certificateByCourse = new Map(certificates.map(certificate => [String(certificate.courseId), certificate]));
  const passedExamCourses = new Set(passedExams.map(attempt => String(attempt.courseId)));

  const result = [];
  for (const course of courses) {
    const lessons = await Lesson.find({ courseId: course._id, published: true }).select('_id sectionId levelId').lean();
    const publishedLevels = new Set((await Level.find({ courseId: course._id, published: true }).select('_id').lean()).map(level => String(level._id)));
    const publishedSections = new Set((await Section.find({ courseId: course._id, published: true }).select('_id levelId').lean())
      .filter(section => publishedLevels.has(String(section.levelId)))
      .map(section => String(section._id)));
    const visibleLessons = lessons.filter(lesson => publishedLevels.has(String(lesson.levelId)) && publishedSections.has(String(lesson.sectionId)));
    const progress = progressByCourse.get(String(course._id));
    const stats = progressStats(visibleLessons, progress?.completedLessonIds ?? []);

    result.push({
      course,
      progress,
      percentage: stats.percentage,
      completed: stats.lessonCount > 0 && stats.percentage === 100,
      lessonCount: visibleLessons.length,
      certificate: certificateByCourse.get(String(course._id)) ?? null,
      reviewEligible: stats.lessonCount > 0 && stats.percentage === 100 && (!course.examEnabled || passedExamCourses.has(String(course._id))),
    });
  }

  return result;
}

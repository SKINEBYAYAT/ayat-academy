import 'server-only';
import mongoose from 'mongoose';
import { Course, Level, Section, Lesson } from '@/lib/db/models/courses';
import { HttpError } from '@/lib/http';

export async function getCourseOr404(courseId: string) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) throw new HttpError(404, 'Course not found.');
  const course = await Course.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found.');
  return course;
}

export async function getCourseContent(courseId: string) {
  await getCourseOr404(courseId);
  const [levels, sections, lessons] = await Promise.all([
    Level.find({ courseId }).sort({ order: 1, createdAt: 1 }).lean(),
    Section.find({ courseId }).sort({ order: 1, createdAt: 1 }).lean(),
    Lesson.find({ courseId }).sort({ order: 1, createdAt: 1 }).select('+videoAssetId +resources.privateAssetId').lean(),
  ]);
  return { levels, sections, lessons };
}

export async function cascadeDeleteCourse(courseId: string) {
  await Promise.all([
    Lesson.deleteMany({ courseId }),
    Section.deleteMany({ courseId }),
    Level.deleteMany({ courseId }),
    Course.deleteOne({ _id: courseId }),
  ]);
}

export async function cascadeDeleteLevel(courseId: string, levelId: string) {
  const level = await Level.findOne({ _id: levelId, courseId });
  if (!level) throw new HttpError(404, 'Level not found.');
  await Promise.all([
    Lesson.deleteMany({ courseId, levelId }),
    Section.deleteMany({ courseId, levelId }),
    Level.deleteOne({ _id: levelId, courseId }),
  ]);
}

export async function cascadeDeleteSection(courseId: string, sectionId: string) {
  const section = await Section.findOne({ _id: sectionId, courseId });
  if (!section) throw new HttpError(404, 'Section not found.');
  await Promise.all([
    Lesson.deleteMany({ courseId, sectionId }),
    Section.deleteOne({ _id: sectionId, courseId }),
  ]);
}

export async function duplicateCourse(courseId: string) {
  const source = await getCourseOr404(courseId);
  const [levels, sections, lessons] = await Promise.all([
    Level.find({ courseId }).sort({ order: 1 }).lean(),
    Section.find({ courseId }).sort({ order: 1 }).lean(),
    Lesson.find({ courseId }).sort({ order: 1 }).select('+videoAssetId +resources.privateAssetId').lean(),
  ]);
  const base = source.slug.replace(/-copy(?:-\d+)?$/, '');
  let n = 0;
  let nextSlug = `${base}-copy`;
  while (await Course.exists({ slug: nextSlug })) nextSlug = `${base}-copy-${++n + 1}`;

  const copy = await Course.create({
    ...source.toObject(), _id: undefined, __v: undefined, createdAt: undefined, updatedAt: undefined,
    title: `${source.title} Copy`, slug: nextSlug, published: false, featured: false,
  });

  const levelMap = new Map<string, mongoose.Types.ObjectId>();
  for (const level of levels) {
    const created = await Level.create({ ...level, _id: undefined, __v: undefined, createdAt: undefined, updatedAt: undefined, courseId: copy._id, published: false });
    levelMap.set(String(level._id), created._id);
  }
  const sectionMap = new Map<string, mongoose.Types.ObjectId>();
  for (const section of sections) {
    const created = await Section.create({ ...section, _id: undefined, __v: undefined, createdAt: undefined, updatedAt: undefined, courseId: copy._id, levelId: levelMap.get(String(section.levelId)), published: false });
    sectionMap.set(String(section._id), created._id);
  }
  for (const lesson of lessons) {
    await Lesson.create({ ...lesson, _id: undefined, __v: undefined, createdAt: undefined, updatedAt: undefined, courseId: copy._id, levelId: levelMap.get(String(lesson.levelId)), sectionId: sectionMap.get(String(lesson.sectionId)), published: false });
  }
  return copy;
}

export async function assertSectionHierarchy(courseId: string, levelId: string) {
  const level = await Level.findOne({ _id: levelId, courseId });
  if (!level) throw new HttpError(400, 'Level does not belong to this course.');
  return level;
}

export async function assertLessonHierarchy(courseId: string, levelId: string, sectionId: string) {
  const section = await Section.findOne({ _id: sectionId, levelId, courseId });
  if (!section) throw new HttpError(400, 'Section and level do not belong to this course.');
  return section;
}

import 'server-only';
import mongoose from 'mongoose';
import { Course, Level, Section, Lesson } from '@/lib/db/models/courses';
import { HttpError } from '@/lib/http';
import { deleteMuxAssetByRef } from '@/lib/media/mux';
import { deleteBlobAsset } from '@/lib/media/storage';


async function deleteLessonAssets(lessons: Array<{ _id: unknown; videoAssetId?: string; resources?: Array<{ privateAssetId?: string }> }>) {
  const deletingIds = lessons.map(lesson => lesson._id);

  for (const lesson of lessons) {
    if (lesson.videoAssetId) {
      const sharedVideo = await Lesson.exists({
        _id: { $nin: deletingIds },
        videoAssetId: lesson.videoAssetId,
      });
      if (!sharedVideo) await deleteMuxAssetByRef(lesson.videoAssetId);
    }

    for (const resource of lesson.resources ?? []) {
      if (!resource.privateAssetId) continue;
      const sharedResource = await Lesson.exists({
        _id: { $nin: deletingIds },
        'resources.privateAssetId': resource.privateAssetId,
      });
      if (!sharedResource) await deleteBlobAsset(resource.privateAssetId);
    }
  }
}

async function deleteCourseImages(course: { _id: unknown; thumbnail?: string; coverImage?: string }) {
  for (const value of [course.thumbnail, course.coverImage]) {
    if (!value) continue;
    const shared = await Course.exists({
      _id: { $ne: course._id },
      $or: [{ thumbnail: value }, { coverImage: value }],
    });
    if (!shared) await deleteBlobAsset(value);
  }
}

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
  const course = await Course.findById(courseId).lean();
  if (!course) throw new HttpError(404, 'Course not found.');

  const lessons = await Lesson.find({ courseId })
    .select('+videoAssetId +resources.privateAssetId')
    .lean();

  await deleteLessonAssets(lessons);
  await deleteCourseImages(course);

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

  const lessons = await Lesson.find({ courseId, levelId })
    .select('+videoAssetId +resources.privateAssetId')
    .lean();
  await deleteLessonAssets(lessons);

  await Promise.all([
    Lesson.deleteMany({ courseId, levelId }),
    Section.deleteMany({ courseId, levelId }),
    Level.deleteOne({ _id: levelId, courseId }),
  ]);
}

export async function cascadeDeleteSection(courseId: string, sectionId: string) {
  const section = await Section.findOne({ _id: sectionId, courseId });
  if (!section) throw new HttpError(404, 'Section not found.');

  const lessons = await Lesson.find({ courseId, sectionId })
    .select('+videoAssetId +resources.privateAssetId')
    .lean();
  await deleteLessonAssets(lessons);

  await Promise.all([
    Lesson.deleteMany({ courseId, sectionId }),
    Section.deleteOne({ _id: sectionId, courseId }),
  ]);
}

export async function deleteLessonWithAssets(courseId: string, lessonId: string) {
  const lesson = await Lesson.findOne({ _id: lessonId, courseId })
    .select('+videoAssetId +resources.privateAssetId')
    .lean();
  if (!lesson) throw new HttpError(404, 'Lesson not found.');

  await deleteLessonAssets([lesson]);
  await Lesson.deleteOne({ _id: lessonId, courseId });
}

export async function duplicateCourse(courseId: string): Promise<{ id: string; slug: string }> {
  const source = await getCourseOr404(courseId);
  const [levels, sections, lessons] = await Promise.all([
    Level.find({ courseId }).sort({ order: 1 }).lean(),
    Section.find({ courseId }).sort({ order: 1 }).lean(),
    Lesson.find({ courseId }).sort({ order: 1 }).select('+videoAssetId +resources.privateAssetId').lean(),
  ]);

  const base = source.slug.replace(/-copy(?:-\d+)?$/, '');
  let suffix = 1;
  let nextSlug = `${base}-copy`;
  while (await Course.exists({ slug: nextSlug })) {
    suffix += 1;
    nextSlug = `${base}-copy-${suffix}`;
  }

  const copy = await Course.create({
    title: `${source.title} Copy`,
    slug: nextSlug,
    shortDescription: source.shortDescription,
    description: source.description,
    thumbnail: source.thumbnail,
    coverImage: source.coverImage,
    priceMinor: source.priceMinor,
    salePriceMinor: source.salePriceMinor,
    currency: source.currency,
    published: false,
    featured: false,
    requirements: source.requirements,
    learningOutcomes: source.learningOutcomes,
    instructorName: source.instructorName,
    instructorBio: source.instructorBio,
    estimatedMinutes: source.estimatedMinutes,
    certificateEnabled: source.certificateEnabled,
    order: source.order,
  });

  const copyId = copy._id as mongoose.Types.ObjectId;
  const levelMap = new Map<string, mongoose.Types.ObjectId>();

  for (const level of levels) {
    const created = await Level.create({
      courseId: copyId,
      title: level.title,
      description: level.description,
      order: level.order,
      published: false,
    });
    levelMap.set(String(level._id), created._id as mongoose.Types.ObjectId);
  }

  const sectionMap = new Map<string, mongoose.Types.ObjectId>();
  for (const section of sections) {
    const mappedLevelId = levelMap.get(String(section.levelId));
    if (!mappedLevelId) throw new HttpError(500, 'Unable to duplicate course hierarchy.');
    const created = await Section.create({
      courseId: copyId,
      levelId: mappedLevelId,
      title: section.title,
      description: section.description,
      order: section.order,
      published: false,
    });
    sectionMap.set(String(section._id), created._id as mongoose.Types.ObjectId);
  }

  for (const lesson of lessons) {
    const mappedLevelId = levelMap.get(String(lesson.levelId));
    const mappedSectionId = sectionMap.get(String(lesson.sectionId));
    if (!mappedLevelId || !mappedSectionId) throw new HttpError(500, 'Unable to duplicate course hierarchy.');
    await Lesson.create({
      courseId: copyId,
      levelId: mappedLevelId,
      sectionId: mappedSectionId,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      videoAssetId: lesson.videoAssetId,
      resources: lesson.resources,
      durationSeconds: lesson.durationSeconds,
      order: lesson.order,
      preview: lesson.preview,
      published: false,
      required: lesson.required,
    });
  }

  return { id: String(copyId), slug: copy.slug };
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

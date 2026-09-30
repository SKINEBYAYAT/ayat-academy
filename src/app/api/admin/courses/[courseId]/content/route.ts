import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { Level, Section, Lesson } from '@/lib/db/models/courses';
import { contentAction } from '@/lib/admin/course-validation';
import { assertLessonHierarchy, assertSectionHierarchy, cascadeDeleteLevel, cascadeDeleteSection, deleteLessonWithAssets, getCourseContent, getCourseOr404 } from '@/lib/admin/course-service';
import { errorResponse, readJson, sameOrigin, HttpError } from '@/lib/http';

export async function GET(_: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    await requireUser(true);
    const { courseId } = await context.params;
    const content = await getCourseContent(courseId);
    return NextResponse.json(content, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    sameOrigin(request);
    await requireUser(true);
    const { courseId } = await context.params;
    await getCourseOr404(courseId);
    const input = contentAction.parse(await readJson(request));

    if (input.action === 'createLevel') {
      const item = await Level.create({ ...input.data, courseId });
      return NextResponse.json({ item }, { status: 201 });
    }
    if (input.action === 'updateLevel') {
      const item = await Level.findOneAndUpdate({ _id: input.id, courseId }, { $set: input.data }, { new: true, runValidators: true });
      if (!item) throw new HttpError(404, 'Level not found.');
      return NextResponse.json({ item });
    }
    if (input.action === 'deleteLevel') {
      await cascadeDeleteLevel(courseId, input.id);
      return NextResponse.json({ message: 'Level and nested content deleted.' });
    }
    if (input.action === 'createSection') {
      await assertSectionHierarchy(courseId, input.data.levelId);
      const item = await Section.create({ ...input.data, courseId });
      return NextResponse.json({ item }, { status: 201 });
    }
    if (input.action === 'updateSection') {
      const existing = await Section.findOne({ _id: input.id, courseId });
      if (!existing) throw new HttpError(404, 'Section not found.');
      const levelId = input.data.levelId ?? String(existing.levelId);
      await assertSectionHierarchy(courseId, levelId);
      const item = await Section.findOneAndUpdate({ _id: input.id, courseId }, { $set: input.data }, { new: true, runValidators: true });
      return NextResponse.json({ item });
    }
    if (input.action === 'deleteSection') {
      await cascadeDeleteSection(courseId, input.id);
      return NextResponse.json({ message: 'Section and lessons deleted.' });
    }
    if (input.action === 'createLesson') {
      await assertLessonHierarchy(courseId, input.data.levelId, input.data.sectionId);
      const item = await Lesson.create({ ...input.data, courseId });
      return NextResponse.json({ item }, { status: 201 });
    }
    if (input.action === 'updateLesson') {
      const existing = await Lesson.findOne({ _id: input.id, courseId });
      if (!existing) throw new HttpError(404, 'Lesson not found.');
      const levelId = input.data.levelId ?? String(existing.levelId);
      const sectionId = input.data.sectionId ?? String(existing.sectionId);
      await assertLessonHierarchy(courseId, levelId, sectionId);
      const item = await Lesson.findOneAndUpdate({ _id: input.id, courseId }, { $set: input.data }, { new: true, runValidators: true }).select('+videoAssetId +resources.privateAssetId');
      return NextResponse.json({ item });
    }
    if (input.action === 'deleteLesson') {
      await deleteLessonWithAssets(courseId, input.id);
      return NextResponse.json({ message: 'Lesson and stored media deleted.' });
    }
    if (input.action === 'reorder') {
      if (input.kind === 'level') {
        const docs = await Level.find({ _id: { $in: input.ids }, courseId }).select('_id');
        if (docs.length !== input.ids.length) throw new HttpError(400, 'One or more levels do not belong to this course.');
        await Promise.all(input.ids.map((id, order) => Level.updateOne({ _id: id, courseId }, { $set: { order } })));
      } else if (input.kind === 'section') {
        const docs = await Section.find({ _id: { $in: input.ids }, courseId }).select('_id levelId');
        if (docs.length !== input.ids.length) throw new HttpError(400, 'One or more sections do not belong to this course.');
        const parents = new Set(docs.map(doc => String(doc.levelId)));
        if (parents.size !== 1) throw new HttpError(400, 'Sections can only be reordered inside the same level.');
        await Promise.all(input.ids.map((id, order) => Section.updateOne({ _id: id, courseId }, { $set: { order } })));
      } else {
        const docs = await Lesson.find({ _id: { $in: input.ids }, courseId }).select('_id sectionId');
        if (docs.length !== input.ids.length) throw new HttpError(400, 'One or more lessons do not belong to this course.');
        const parents = new Set(docs.map(doc => String(doc.sectionId)));
        if (parents.size !== 1) throw new HttpError(400, 'Lessons can only be reordered inside the same section.');
        await Promise.all(input.ids.map((id, order) => Lesson.updateOne({ _id: id, courseId }, { $set: { order } })));
      }
      return NextResponse.json({ message: 'Order saved.' });
    }
    throw new HttpError(400, 'Unsupported action.');
  } catch (error) { return errorResponse(error); }
}

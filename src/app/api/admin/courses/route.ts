import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { Course, Level, Section, Lesson } from '@/lib/db/models/courses';
import { courseInput } from '@/lib/admin/course-validation';
import { errorResponse, readJson, sameOrigin, HttpError } from '@/lib/http';

export async function GET() {
  try {
    await requireUser(true);
    const courses = await Course.find().sort({ order: 1, createdAt: -1 }).lean();
    const ids = courses.map(course => course._id);
    const [levels, sections, lessons] = await Promise.all([
      Level.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: '$courseId', count: { $sum: 1 } } }]),
      Section.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: '$courseId', count: { $sum: 1 } } }]),
      Lesson.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: '$courseId', count: { $sum: 1 } } }]),
    ]);
    const map = (rows: { _id: unknown; count: number }[]) => new Map(rows.map(row => [String(row._id), row.count]));
    const lm = map(levels), sm = map(sections), xm = map(lessons);
    return NextResponse.json({ courses: courses.map(course => ({ ...course, levelCount: lm.get(String(course._id)) ?? 0, sectionCount: sm.get(String(course._id)) ?? 0, lessonCount: xm.get(String(course._id)) ?? 0 })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireUser(true);
    const data = courseInput.parse(await readJson(request));
    if (data.salePriceMinor != null && data.salePriceMinor > data.priceMinor) throw new HttpError(400, 'Sale price cannot be greater than the regular price.');
    if (await Course.exists({ slug: data.slug })) throw new HttpError(409, 'That course URL is already in use.');
    const course = await Course.create(data);
    return NextResponse.json({ course: { id: String(course._id), slug: course.slug } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

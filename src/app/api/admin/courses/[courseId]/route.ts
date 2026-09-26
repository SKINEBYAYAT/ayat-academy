import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { Course } from '@/lib/db/models/courses';
import { courseInput } from '@/lib/admin/course-validation';
import { cascadeDeleteCourse, getCourseOr404 } from '@/lib/admin/course-service';
import { errorResponse, readJson, sameOrigin, HttpError } from '@/lib/http';

export async function GET(_: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    await requireUser(true);
    const { courseId } = await context.params;
    const course = await getCourseOr404(courseId);
    return NextResponse.json({ course }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    sameOrigin(request);
    await requireUser(true);
    const { courseId } = await context.params;
    await getCourseOr404(courseId);
    const data = courseInput.partial().parse(await readJson(request));
    if (data.slug && await Course.exists({ slug: data.slug, _id: { $ne: courseId } })) throw new HttpError(409, 'That course URL is already in use.');
    if (data.salePriceMinor != null && data.priceMinor != null && data.salePriceMinor > data.priceMinor) throw new HttpError(400, 'Sale price cannot be greater than the regular price.');
    const course = await Course.findByIdAndUpdate(courseId, { $set: data }, { new: true, runValidators: true });
    return NextResponse.json({ course });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    sameOrigin(request);
    await requireUser(true);
    const { courseId } = await context.params;
    await getCourseOr404(courseId);
    await cascadeDeleteCourse(courseId);
    return NextResponse.json({ message: 'Course and all nested content deleted.' });
  } catch (error) { return errorResponse(error); }
}

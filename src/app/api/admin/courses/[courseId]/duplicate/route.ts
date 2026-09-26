import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { duplicateCourse } from '@/lib/admin/course-service';
import { errorResponse, sameOrigin } from '@/lib/http';

export async function POST(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    sameOrigin(request);
    await requireUser(true);
    const { courseId } = await context.params;
    const course = await duplicateCourse(courseId);
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

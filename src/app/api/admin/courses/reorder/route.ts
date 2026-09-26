import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { Course } from '@/lib/db/models/courses';
import { objectId } from '@/lib/admin/course-validation';
import { errorResponse, readJson, sameOrigin, HttpError } from '@/lib/http';
import { z } from 'zod';

const schema = z.object({ ids: z.array(objectId).min(1).max(500) });

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireUser(true);
    const { ids } = schema.parse(await readJson(request));
    const courses = await Course.find({ _id: { $in: ids } }).select('_id');
    if (courses.length !== ids.length) throw new HttpError(400, 'One or more courses do not exist.');
    await Promise.all(ids.map((id, order) => Course.updateOne({ _id: id }, { $set: { order } })));
    return NextResponse.json({ message: 'Course order saved.' });
  } catch (error) {
    return errorResponse(error);
  }
}

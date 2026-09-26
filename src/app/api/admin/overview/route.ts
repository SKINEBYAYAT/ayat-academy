import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { User } from '@/lib/db/models/auth';
import { Course } from '@/lib/db/models/courses';
import { errorResponse } from '@/lib/http';
export async function GET() {
  try { await requireUser(true); const [students, courses] = await Promise.all([User.countDocuments({ role: 'student' }), Course.countDocuments()]); return NextResponse.json({ students, courses }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}

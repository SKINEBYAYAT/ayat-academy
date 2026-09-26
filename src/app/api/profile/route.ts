import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { fullName } from '@/lib/auth/validation';
import { errorResponse, readJson, sameOrigin } from '@/lib/http';
import { User } from '@/lib/db/models/auth';
import { z } from 'zod';
export async function GET() {
  try { const user = await requireUser(); return NextResponse.json({ fullName: user.fullName, email: user.email, role: user.role }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const data = z.object({ fullName }).parse(await readJson(request));
    await User.updateOne({ _id: user._id }, { $set: { fullName: data.fullName } }, { runValidators: true });
    return NextResponse.json({ message: 'Profile updated.' });
  } catch (error) { return errorResponse(error); }
}

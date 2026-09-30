import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/http';

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(
      { fullName: user.fullName, email: user.email, role: user.role },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Your certificate name is locked. Contact Ayat Academy if it needs to be corrected.' },
    { status: 403 },
  );
}

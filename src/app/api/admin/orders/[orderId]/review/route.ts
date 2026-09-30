import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { sameOrigin } from '@/lib/http';

export async function POST(request: Request) {
  sameOrigin(request);
  await requireUser(true);
  return NextResponse.json(
    { error: 'Manual crypto payment approval is disabled. Payments are verified automatically by the payment provider.' },
    { status: 410 },
  );
}

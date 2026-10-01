import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    reownProjectIdConfigured: Boolean(process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim()),
    environment: process.env.VERCEL_ENV ?? 'unknown',
  });
}

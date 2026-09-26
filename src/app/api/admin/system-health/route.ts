import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requireUser } from '@/lib/auth/session';
import { launchReadiness, readinessSummary } from '@/lib/launch/readiness';
import { errorResponse } from '@/lib/http';

export async function GET() {
  try {
    await requireUser(true);
    const checks = launchReadiness(process.env);
    const summary = readinessSummary(checks);

    return NextResponse.json({
      ok: mongoose.connection.readyState === 1,
      databaseState: mongoose.connection.readyState,
      readiness: summary,
      checks,
      timestamp: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

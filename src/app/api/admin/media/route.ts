import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { saveMedia } from '@/lib/media/storage';
import { errorResponse, HttpError } from '@/lib/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

function assertUploadOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const explicit = process.env.APP_URL?.trim();
  const vercel = process.env.VERCEL_URL?.trim();
  const expected = explicit || (vercel ? 'https://' + vercel : '');

  let expectedOrigin = '';
  try {
    expectedOrigin = new URL(expected).origin;
  } catch {
    throw new HttpError(503, 'Application URL is not configured correctly.');
  }

  if (!origin || origin !== expectedOrigin) {
    throw new HttpError(403, 'Request origin is not allowed.');
  }
}

export async function POST(request: Request) {
  try {
    assertUploadOrigin(request);
    await requireUser(true);

    const size = Number(request.headers.get('content-length') || 0);
    if (size > 13 * 1024 * 1024) throw new HttpError(413, 'Upload is too large.');

    const form = await request.formData();
    const file = form.get('file');
    const kind = form.get('kind');

    if (!(file instanceof File)) throw new HttpError(400, 'A file is required.');
    if (kind !== 'image' && kind !== 'resource') throw new HttpError(400, 'Invalid media type.');

    const media = await saveMedia(file, kind);
    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

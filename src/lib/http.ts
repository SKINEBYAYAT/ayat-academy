import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

function expectedOrigin() {
  const explicit = process.env.APP_URL?.trim();
  const vercel = process.env.VERCEL_URL?.trim();
  const candidate = explicit || (vercel ? `https://${vercel}` : '');
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error();
    return url.origin;
  } catch {
    throw new HttpError(503, 'Application URL is not configured correctly.');
  }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  let requestOrigin = '';
  try { requestOrigin = new URL(request.url).origin; } catch {}

  // Accept the actual host serving this request (Vercel production aliases/custom domains)
  // or the configured canonical APP_URL. This keeps CSRF protection without breaking login
  // whenever Vercel serves the same deployment from a different production hostname.
  const allowed = new Set<string>([requestOrigin]);
  try { allowed.add(expectedOrigin()); } catch {}

  if (!origin || !allowed.has(origin)) throw new HttpError(403, 'Request origin is not allowed.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'JSON is required.');
}
export async function readJson(request: Request) {
  if (!request.body) throw new HttpError(400, 'JSON body is required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(body); } catch { throw new HttpError(400, 'Invalid JSON.'); }
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) { console.warn('Request rejected', { status: error.status, message: error.message }); return NextResponse.json({ error: error.message }, { status: error.status }); }
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
  // Never include database queries, credentials, tokens, or provider errors in responses/logs.
  console.error('Request failed:', error instanceof Error ? error.name : 'UnknownError');
  return NextResponse.json({ error: 'The service is temporarily unavailable. Please try again later.' }, { status: 503 });
}

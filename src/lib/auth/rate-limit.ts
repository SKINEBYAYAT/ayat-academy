import { RateLimit } from '@/lib/db/models/auth';
import { hashToken } from './crypto';
import { HttpError } from '@/lib/http';
export async function rateLimit(subject: string, limit: number, windowSeconds = 900) {
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = hashToken(`${subject}:${window}`);
  let entry;
  try {
    entry = await RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * windowSeconds * 1000) } }, { upsert: true, returnDocument: 'after' });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    entry = await RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 } }, { returnDocument: 'after' });
  }
  if (!entry || entry.count > limit) throw new HttpError(429, 'Too many attempts. Please try again in 15 minutes.');
}
export function requestIp(request: Request) {
  // Vercel overwrites this header. Do not trust arbitrary forwarded headers on other hosts.
  return process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown' : 'local';
}

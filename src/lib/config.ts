import { HttpError } from '@/lib/http';

export function assertAuthConfig() {
  if (!process.env.MONGODB_URI) throw new HttpError(503, 'Database service is not configured.');
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new HttpError(503, 'Authentication service is not configured.');
  try {
    const url = new URL(process.env.APP_URL ?? '');
    if (!['http:', 'https:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error();
  } catch { throw new HttpError(503, 'Application URL is not configured correctly.'); }
}

export function assertEmailConfig() {
  if (process.env.EMAIL_PROVIDER !== 'smtp' || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.EMAIL_FROM) {
    throw new HttpError(503, 'Email service is not configured. Contact the site administrator.');
  }
  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new HttpError(503, 'Email service is not configured correctly.');
}

import 'server-only';
import { VerificationCode, type UserData } from '@/lib/db/models/auth';
import { hashToken, newCode, newToken } from './crypto';
import { sendEmail } from '@/lib/email/service';
import type { Types } from 'mongoose';
import { after } from 'next/server';
import { rateLimit } from './rate-limit';
import { assertEmailConfig, getAppUrl } from '@/lib/config';

export function deliverChallenge(email: string, token: string, code: string, purpose: 'login' | 'reset') {
  // Run after the HTTP response: SMTP timing/failure must not reveal account existence.
  // Next's after() keeps the Vercel invocation alive for this work.
  after(async () => {
    try {
      await sendEmail({ to: email, kind: purpose === 'login' ? 'login' : 'password-reset', subject: purpose === 'login' ? 'Your Ayat Academy security code' : 'Reset your Ayat Academy password', text: purpose === 'login' ? `Your one-time security code is ${code}. It expires in 10 minutes. If you did not request this, do not share this code.` : `Reset your password: ${getAppUrl()}/reset-password#token=${token}\nThis link expires in 10 minutes and can only be used once.` });
    } catch { console.error('Security email delivery failed. Check the configured email provider.'); }
  });
}
export async function sendChallenge(user: UserData & { _id: Types.ObjectId }, purpose: 'login' | 'reset') {
  assertEmailConfig();
  await rateLimit(`email:${purpose}:${user._id}`, 5);
  const token = newToken();
  const code = purpose === 'login' ? newCode() : token;
  await VerificationCode.create({ tokenHash: hashToken(token), codeHash: hashToken(`${token}:${code}`), userId: user._id, purpose, authVersion: user.authVersion, expiresAt: new Date(Date.now() + 600000) });
  deliverChallenge(user.email, token, code, purpose);
  return token;
}

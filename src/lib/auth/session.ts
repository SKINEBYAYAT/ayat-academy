import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { Session, User, type UserData } from '@/lib/db/models/auth';
import { hashToken, newToken } from './crypto';
import { HttpError } from '@/lib/http';
import type { Types } from 'mongoose';
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
export const sessionCookie = process.env.NODE_ENV === 'production' ? '__Host-ayat-session' : 'ayat-session';
export const deviceCookie = process.env.NODE_ENV === 'production' ? '__Host-ayat-device' : 'ayat-device';
export async function createSession(user: UserData & { _id: Types.ObjectId }) {
  const jar = await cookies();
  const old = jar.get(sessionCookie)?.value;
  if (old) await Session.deleteOne({ tokenHash: hashToken(old) });
  const token = newToken();
  const seconds = user.role === 'admin' ? 60 * 60 : 60 * 60 * 24 * 7;
  await Session.create({ userId: user._id, authVersion: user.authVersion, role: user.role, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + seconds * 1000) });
  jar.set(sessionCookie, token, { ...cookieOptions, maxAge: seconds });
}
export async function currentUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  return User.findOne({ _id: session.userId, authVersion: session.authVersion, role: session.role, emailVerifiedAt: { $ne: null } });
}
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Please sign in.');
  if (admin && user.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
  return user;
}
export async function requirePageUser(admin = false) {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (admin && user.role !== 'admin') redirect('/dashboard');
  return user;
}

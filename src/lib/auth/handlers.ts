import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { User, Session, TrustedDevice, VerificationCode } from '@/lib/db/models/auth';
import { registerSchema, loginSchema, verifySchema, resetSchema, challengeSchema, email } from './validation';
import { hashPassword, verifyPassword, hashToken, newToken, newCode } from './crypto';
import { rateLimit } from './rate-limit';
import { createSession, cookieOptions, deviceCookie, sessionCookie } from './session';
import { sendChallenge, deliverChallenge } from './challenges';
import { HttpError } from '@/lib/http';
import { assertEmailConfig } from '@/lib/config';

export async function register(data: unknown) {
  const input = registerSchema.parse(data);
  assertEmailConfig();
  await rateLimit(`register:${input.email}`, 3);
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    // Match password hashing cost and return an opaque challenge to avoid account enumeration.
    await hashPassword(input.password);
    return NextResponse.json({ challenge: newToken() });
  }
  let user;
  try { user = await User.create({ fullName: input.fullName, email: input.email, passwordHash: await hashPassword(input.password), role: 'student' }); }
  catch (error) { if ((error as { code?: number }).code === 11000) return NextResponse.json({ challenge: newToken() }); throw error; }
  const challenge = await sendChallenge(user, 'login');
  return NextResponse.json({ challenge });
}
export async function login(data: unknown, request: Request) {
  const input = loginSchema.parse(data);
  await rateLimit(`login:${input.email}`, 8);
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  // Valid fixed bcrypt hash prevents a fast path for unknown accounts.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  if (!user || !valid) throw new HttpError(401, 'Email or password is incorrect.');
  // Email verification is required only once. After the account has been
  // verified, future sign-ins use email + password without another code.
  if (user.emailVerifiedAt) {
    await createSession(user);
    return NextResponse.json({ redirect: user.role === 'admin' ? '/admin' : '/dashboard' });
  }

  return NextResponse.json({ challenge: await sendChallenge(user, 'login') });
}
export async function verify(data: unknown, request: Request) {
  const input = verifySchema.parse(data);
  await rateLimit(`verify:${input.challenge}`, 5);
  const challenge = await VerificationCode.findOneAndUpdate({ tokenHash: hashToken(input.challenge), purpose: 'login', expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { returnDocument: 'after' }).select('+codeHash');
  if (!challenge || challenge.codeHash !== hashToken(`${input.challenge}:${input.code}`)) throw new HttpError(400, 'Invalid or expired code.');
  // Atomic deletion makes concurrent reuse impossible.
  const consumed = await VerificationCode.deleteOne({ _id: challenge._id, codeHash: challenge.codeHash });
  if (consumed.deletedCount !== 1) throw new HttpError(400, 'This code has already been used.');
  const user = await User.findOneAndUpdate({ _id: challenge.userId, authVersion: challenge.authVersion }, { $set: { emailVerifiedAt: new Date() } }, { returnDocument: 'after' });
  if (!user) throw new HttpError(400, 'Please sign in again.');
  await createSession(user);
  if (input.trustDevice && user.role !== 'admin') {
    const token = newToken();
    const maxAge = 60 * 60 * 24 * 30;
    await TrustedDevice.create({ userId: user._id, authVersion: user.authVersion, tokenHash: hashToken(token), userAgentHash: hashToken(request.headers.get('user-agent') ?? ''), expiresAt: new Date(Date.now() + maxAge * 1000) });
    (await cookies()).set(deviceCookie, token, { ...cookieOptions, maxAge });
  }
  return NextResponse.json({ redirect: user.role === 'admin' ? '/admin' : '/dashboard' });
}
export async function forgot(data: unknown) {
  const address = email.parse((data as { email?: unknown })?.email);
  assertEmailConfig();
  await rateLimit(`reset:${address}`, 3);
  const user = await User.findOne({ email: address });
  if (user) {
    try { await sendChallenge(user, 'reset'); }
    catch (error) { if (!(error instanceof HttpError) || error.status !== 429) throw error; }
  }
  return NextResponse.json({ message: 'If an account exists, a password reset link has been sent.' });
}
export async function resend(data: unknown) {
  const { challenge } = challengeSchema.parse(data);
  assertEmailConfig();
  await rateLimit(`resend:${challenge}`, 5);
  const now = new Date();
  const code = newCode();
  const entry = await VerificationCode.findOneAndUpdate({ tokenHash: hashToken(challenge), purpose: 'login', expiresAt: { $gt: now }, attempts: { $lt: 5 }, lastSentAt: { $lte: new Date(now.getTime() - 60000) } }, { $set: { lastSentAt: now, codeHash: hashToken(`${challenge}:${code}`) } }, { returnDocument: 'after' });
  if (entry) {
    const user = await User.findOne({ _id: entry.userId, authVersion: entry.authVersion });
    if (user) {
      try { await rateLimit(`email:login:${user._id}`, 5); deliverChallenge(user.email, challenge, code, 'login'); }
      catch (error) { if (!(error instanceof HttpError) || error.status !== 429) throw error; }
    }
  }
  return NextResponse.json({ message: 'If your request is eligible, a new code will arrive shortly. Allow 60 seconds between requests.' });
}
export async function reset(data: unknown) {
  const input = resetSchema.parse(data);
  const passwordHash = await hashPassword(input.password);
  const challenge = await VerificationCode.findOneAndDelete({ tokenHash: hashToken(input.token), codeHash: hashToken(`${input.token}:${input.token}`), purpose: 'reset', expiresAt: { $gt: new Date() } });
  if (!challenge) throw new HttpError(400, 'Invalid or expired reset link.');
  const user = await User.findOneAndUpdate({ _id: challenge.userId, authVersion: challenge.authVersion }, { $set: { passwordHash }, $inc: { authVersion: 1 } });
  if (!user) throw new HttpError(400, 'This reset link is no longer valid.');
  await Promise.all([Session.deleteMany({ userId: user._id }), TrustedDevice.deleteMany({ userId: user._id }), VerificationCode.deleteMany({ userId: user._id })]);
  return NextResponse.json({ message: 'Password updated. Sign in with your new password.' });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
  jar.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
  return NextResponse.json({ redirect: '/login' });
}

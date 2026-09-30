import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { User, Session, TrustedDevice, VerificationCode } from '@/lib/db/models/auth';
import { registerSchema, loginSchema, verifySchema, resetSchema } from './validation';
import { hashPassword, verifyPassword, hashToken, newToken } from './crypto';
import { rateLimit } from './rate-limit';
import { createSession, cookieOptions, deviceCookie, sessionCookie } from './session';
import { HttpError } from '@/lib/http';

export async function register(data: unknown) {
  const input = registerSchema.parse(data);
  await rateLimit(`register:${input.email}`, 3);
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    await hashPassword(input.password);
    throw new HttpError(409, 'An account with this email already exists. Please sign in.');
  }

  let user;
  try {
    user = await User.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'student',
      emailVerifiedAt: new Date(),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new HttpError(409, 'An account with this email already exists. Please sign in.');
    }
    throw error;
  }

  await createSession(user);
  return NextResponse.json({ redirect: '/dashboard' });
}

export async function login(data: unknown, _request: Request) {
  const input = loginSchema.parse(data);
  await rateLimit(`login:${input.email}`, 8);
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const valid = await verifyPassword(input.password, user?.passwordHash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  if (!user || !valid) throw new HttpError(401, 'Email or password is incorrect.');

  await createSession(user);
  return NextResponse.json({ redirect: user.role === 'admin' ? '/admin' : '/dashboard' });
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
export async function forgot(_data: unknown) {
  return NextResponse.json(
    { message: 'Email password recovery is temporarily unavailable. Please contact Ayat Academy if you need your password reset.' },
    { status: 503 },
  );
}

export async function resend(_data: unknown) {
  return NextResponse.json(
    { error: 'Email verification is currently disabled. Sign in with your email and password.' },
    { status: 410 },
  );
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

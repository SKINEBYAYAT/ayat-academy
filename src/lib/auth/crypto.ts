import { createHmac, randomBytes, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
export function hashToken(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters.');
  return createHmac('sha256', secret).update(value).digest('hex');
}
export const newToken = () => randomBytes(32).toString('base64url');
export const newCode = () => randomInt(100000, 1000000).toString();
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

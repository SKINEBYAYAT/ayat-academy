import { z } from 'zod';
export const email = z.string().trim().email().max(254).transform(value => value.toLowerCase());
export const password = z.string().min(8, 'Use at least 8 characters.').refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.');
export const fullName = z.string().trim().min(2).max(100);
export const registerSchema = z.object({ fullName, email, password });
export const loginSchema = z.object({ email, password: z.string().min(1).max(200) });
export const verifySchema = z.object({ challenge: z.string().min(40).max(100), code: z.string().regex(/^\d{6}$/), trustDevice: z.boolean().default(false) });
export const challengeSchema = z.object({ challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
export const resetSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password });

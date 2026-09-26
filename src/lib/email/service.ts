import 'server-only';
import nodemailer from 'nodemailer';
import { assertEmailConfig } from '@/lib/config';
export type EmailKind = 'verification' | 'login' | 'password-reset' | 'purchase' | 'completion' | 'certificate';
export async function sendEmail(message: { to: string; subject: string; text: string; kind: EmailKind }) {
  assertEmailConfig();
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !EMAIL_FROM) throw new Error('SMTP is not configured.');
  const transport = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: SMTP_PORT === '465', requireTLS: SMTP_PORT !== '465', auth: { user: SMTP_USER, pass: SMTP_PASSWORD }, connectionTimeout: 10000 });
  await transport.sendMail({ from: EMAIL_FROM, to: message.to, subject: message.subject, text: message.text });
}

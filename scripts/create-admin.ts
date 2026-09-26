import { createInterface } from 'node:readline/promises';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db/connect';
import { User } from '../src/lib/db/models/auth';
import { hashPassword } from '../src/lib/auth/crypto';
import { registerSchema } from '../src/lib/auth/validation';

async function hiddenPrompt(label: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (buffer: Buffer) => {
      for (const char of buffer.toString()) {
        if (char === '\r' || char === '\n' || char === '\u0003') {
          process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n');
          if (char === '\u0003') reject(new Error('Cancelled.')); else resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}
async function main() {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const fullName = await terminal.question('Administrator full name: ');
  const email = await terminal.question('Administrator email: ');
  terminal.close();
  const password = await hiddenPrompt('Password (hidden, at least 12 characters): ');
  const passwordConfirmation = await hiddenPrompt('Confirm password (hidden): ');
  const input = registerSchema.parse({ fullName, email, password, passwordConfirmation });
  await connectDB(); await User.init();
  if (await User.exists({ email: input.email })) throw new Error('An account with this email already exists. No account was changed.');
  await User.create({ fullName: input.fullName, email: input.email, passwordHash: await hashPassword(input.password), role: 'admin' });
  console.log('Administrator created. Sign in and verify the email security code.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Administrator creation failed.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());

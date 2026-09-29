import mongoose from 'mongoose';
import { HttpError } from '@/lib/http';
import { User, Session, VerificationCode, TrustedDevice, RateLimit } from './models/auth';

const state = globalThis as typeof globalThis & { mongoPromise?: Promise<typeof mongoose> };

function mongoHost(uri: string) {
  try {
    return new URL(uri).hostname;
  } catch {
    return 'invalid-uri';
  }
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new HttpError(503, 'Database service is not configured.');

  state.mongoPromise ??= mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 }).then(async connection => {
    // Security depends on unique indexes being ready before accepting requests.
    await Promise.all([User.init(), Session.init(), VerificationCode.init(), TrustedDevice.init(), RateLimit.init()]);
    return connection;
  }).catch(error => {
    state.mongoPromise = undefined;
    console.error('MongoDB connection failed', {
      host: mongoHost(uri),
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  });

  return state.mongoPromise;
}

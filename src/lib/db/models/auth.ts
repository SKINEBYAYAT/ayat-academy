import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema({
  fullName: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student', required: true },
  emailVerifiedAt: Date,
  authVersion: { type: Number, default: 0, required: true },
}, { timestamps: true });
export type UserData = InferSchemaType<typeof userSchema>;
export const User = (models.User as Model<UserData>) || model('User', userSchema);

const sessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  authVersion: { type: Number, required: true },
  role: { type: String, enum: ['student', 'admin'], required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });
export const Session = (models.Session as Model<InferSchemaType<typeof sessionSchema>>) || model('Session', sessionSchema);

const codeSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true, select: false },
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  purpose: { type: String, enum: ['login', 'reset'], required: true },
  authVersion: { type: Number, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });
export const VerificationCode = (models.VerificationCode as Model<InferSchemaType<typeof codeSchema>>) || model('VerificationCode', codeSchema);

const deviceSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  authVersion: { type: Number, required: true },
  userAgentHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export const TrustedDevice = (models.TrustedDevice as Model<InferSchemaType<typeof deviceSchema>>) || model('TrustedDevice', deviceSchema);

const rateSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export const RateLimit = (models.RateLimit as Model<InferSchemaType<typeof rateSchema>>) || model('RateLimit', rateSchema);

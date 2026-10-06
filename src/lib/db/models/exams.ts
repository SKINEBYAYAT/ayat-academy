import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const ref = (name: string) => ({ type: Schema.Types.ObjectId, ref: name, required: true, index: true });

const examQuestionSchema = new Schema({
  courseId: ref('Course'),
  question: { type: String, required: true, trim: true },
  options: { type: [String], required: true, validate: [(v: string[]) => v.length >= 2 && v.length <= 6, 'Use 2 to 6 options.'] },
  correctIndex: { type: Number, required: true, min: 0, max: 5 },
  order: { type: Number, default: 0 },
  published: { type: Boolean, default: true },
}, { timestamps: true });
examQuestionSchema.index({ courseId: 1, order: 1 });

export const ExamQuestion = (models.ExamQuestion as Model<InferSchemaType<typeof examQuestionSchema>>) || model('ExamQuestion', examQuestionSchema);

const examAttemptSchema = new Schema({
  userId: ref('User'),
  courseId: ref('Course'),
  answers: [{ questionId: { type: Schema.Types.ObjectId, ref: 'ExamQuestion', required: true }, selectedIndex: { type: Number, required: true } }],
  scorePercent: { type: Number, required: true, min: 0, max: 100 },
  passed: { type: Boolean, required: true },
  submittedAt: { type: Date, default: Date.now, required: true },
  nextAttemptAt: Date,
}, { timestamps: true });
examAttemptSchema.index({ userId: 1, courseId: 1, submittedAt: -1 });

export const ExamAttempt = (models.ExamAttempt as Model<InferSchemaType<typeof examAttemptSchema>>) || model('ExamAttempt', examAttemptSchema);

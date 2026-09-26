import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
const ref = (name: string) => ({ type: Schema.Types.ObjectId, ref: name, required: true, index: true });
const courseSchema = new Schema({
  title: { type: String, required: true }, slug: { type: String, unique: true, required: true },
  shortDescription: String, description: String, thumbnail: String, coverImage: String,
  priceMinor: { type: Number, min: 0, default: 0 }, salePriceMinor: { type: Number, min: 0 },
  currency: { type: String, default: 'USD' }, published: { type: Boolean, default: false },
  featured: { type: Boolean, default: false }, requirements: [String], learningOutcomes: [String],
  instructorName: String, instructorBio: String, estimatedMinutes: Number,
  certificateEnabled: { type: Boolean, default: false }, order: { type: Number, default: 0 },
}, { timestamps: true });
courseSchema.index({ published: 1, featured: 1, order: 1 });
export const Course = (models.Course as Model<InferSchemaType<typeof courseSchema>>) || model('Course', courseSchema);
const levelSchema = new Schema({ courseId: ref('Course'), title: { type: String, required: true }, description: String, order: { type: Number, default: 0 }, published: { type: Boolean, default: false } }, { timestamps: true });
levelSchema.index({ courseId: 1, order: 1 });
export const Level = (models.Level as Model<InferSchemaType<typeof levelSchema>>) || model('Level', levelSchema);
const sectionSchema = new Schema({ courseId: ref('Course'), levelId: ref('Level'), title: { type: String, required: true }, description: String, order: { type: Number, default: 0 }, published: { type: Boolean, default: false } }, { timestamps: true });
sectionSchema.index({ levelId: 1, order: 1 });
export const Section = (models.Section as Model<InferSchemaType<typeof sectionSchema>>) || model('Section', sectionSchema);
const lessonSchema = new Schema({
  courseId: ref('Course'), levelId: ref('Level'), sectionId: ref('Section'), title: { type: String, required: true },
  description: String, content: String, videoAssetId: { type: String, select: false },
  resources: [{ title: String, privateAssetId: { type: String, select: false } }], durationSeconds: Number,
  order: { type: Number, default: 0 }, preview: { type: Boolean, default: false },
  published: { type: Boolean, default: false }, required: { type: Boolean, default: true },
}, { timestamps: true });
lessonSchema.index({ sectionId: 1, order: 1 });
export const Lesson = (models.Lesson as Model<InferSchemaType<typeof lessonSchema>>) || model('Lesson', lessonSchema);
const enrollmentSchema = new Schema({
  userId: ref('User'), courseId: ref('Course'), source: { type: String, enum: ['purchase', 'admin'], required: true },
  active: { type: Boolean, default: true }, grantedBy: { type: Schema.Types.ObjectId, ref: 'User' }, expiresAt: Date,
}, { timestamps: true });
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
export const Enrollment = (models.Enrollment as Model<InferSchemaType<typeof enrollmentSchema>>) || model('Enrollment', enrollmentSchema);
const progressSchema = new Schema({
  userId: ref('User'), courseId: ref('Course'), completedLessonIds: [Schema.Types.ObjectId],
  currentLessonId: Schema.Types.ObjectId, videoPositions: { type: Map, of: Number },
  lastAccessedAt: Date, completedAt: Date,
}, { timestamps: true });
progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
export const CourseProgress = (models.CourseProgress as Model<InferSchemaType<typeof progressSchema>>) || model('CourseProgress', progressSchema);

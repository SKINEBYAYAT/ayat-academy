import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
export const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only.').max(120);
const text = (max: number) => z.string().trim().max(max).optional().default('');
const money = z.number().int().min(0).max(100_000_000);

export const courseInput = z.object({
  title: z.string().trim().min(2).max(160),
  slug,
  shortDescription: text(320),
  description: text(20_000),
  thumbnail: text(500),
  coverImage: text(500),
  priceMinor: money.default(0),
  salePriceMinor: money.optional().nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('USD'),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  requirements: z.array(z.string().trim().min(1).max(300)).max(50).default([]),
  learningOutcomes: z.array(z.string().trim().min(1).max(300)).max(50).default([]),
  instructorName: text(120),
  instructorBio: text(5000),
  estimatedMinutes: z.number().int().min(0).max(100_000).optional().nullable(),
  certificateEnabled: z.boolean().default(true),
  order: z.number().int().min(0).max(1_000_000).default(0),
});

export const levelInput = z.object({
  title: z.string().trim().min(1).max(160),
  description: text(3000),
  published: z.boolean().default(false),
  order: z.number().int().min(0).max(1_000_000).default(0),
});

export const sectionInput = z.object({
  levelId: objectId,
  title: z.string().trim().min(1).max(160),
  description: text(3000),
  published: z.boolean().default(false),
  order: z.number().int().min(0).max(1_000_000).default(0),
});

export const lessonInput = z.object({
  levelId: objectId,
  sectionId: objectId,
  title: z.string().trim().min(1).max(180),
  description: text(3000),
  content: text(50_000),
  videoAssetId: text(500),
  durationSeconds: z.number().int().min(0).max(1_000_000).optional().nullable(),
  preview: z.boolean().default(false),
  published: z.boolean().default(false),
  order: z.number().int().min(0).max(1_000_000).default(0),
  resources: z.array(z.object({ title: z.string().trim().min(1).max(160), privateAssetId: z.string().trim().min(1).max(500) })).max(50).default([]),
});

export const contentAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('createLevel'), data: levelInput }),
  z.object({ action: z.literal('updateLevel'), id: objectId, data: levelInput.partial() }),
  z.object({ action: z.literal('deleteLevel'), id: objectId }),
  z.object({ action: z.literal('createSection'), data: sectionInput }),
  z.object({ action: z.literal('updateSection'), id: objectId, data: sectionInput.partial() }),
  z.object({ action: z.literal('deleteSection'), id: objectId }),
  z.object({ action: z.literal('createLesson'), data: lessonInput }),
  z.object({ action: z.literal('updateLesson'), id: objectId, data: lessonInput.partial() }),
  z.object({ action: z.literal('deleteLesson'), id: objectId }),
  z.object({ action: z.literal('reorder'), kind: z.enum(['level', 'section', 'lesson']), ids: z.array(objectId).min(1).max(500) }),
]);

import type { MetadataRoute } from 'next';
import { Course } from '@/lib/db/models/courses';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || 'http://localhost:3000';
  const courses = await Course.find({ published: true }).select('slug updatedAt').sort({ updatedAt: -1 }).lean();

  return [
    { url: new URL('/', base).toString(), lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: new URL('/courses', base).toString(), lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...courses.map(course => ({
      url: new URL('/course/' + course.slug, base).toString(),
      lastModified: new Date(course.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}

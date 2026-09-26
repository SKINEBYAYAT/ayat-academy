import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || 'http://localhost:3000';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/courses', '/course/'],
      disallow: [
        '/api/',
        '/admin/',
        '/dashboard',
        '/learn/',
        '/checkout/',
        '/login',
        '/register',
        '/verify',
        '/forgot-password',
        '/reset-password',
      ],
    },
    sitemap: new URL('/sitemap.xml', base).toString(),
  };
}

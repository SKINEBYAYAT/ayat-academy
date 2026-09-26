import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ayat Academy',
    short_name: 'Ayat Academy',
    description: 'Professional skincare education by Ayat Academy.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f5ef',
    theme_color: '#294c3e',
    orientation: 'portrait-primary',
    icons: [
      { src: '/pwa-icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon?size=512&maskable=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

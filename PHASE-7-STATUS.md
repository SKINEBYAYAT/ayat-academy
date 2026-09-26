# Phase 7 status — PWA, SEO, and public polish

Development branch: `phase7-pwa-seo-polish`

## Implemented

- Installable PWA manifest.
- Generated 192px and 512px PWA icons, including a maskable icon.
- Service worker registration.
- Public-page/static-asset caching without caching authenticated/admin/API routes.
- iPhone/Apple web app metadata.
- Production SEO metadata and canonical URLs.
- Public robots.txt rules.
- Dynamic sitemap with published courses.
- Dynamic course metadata for social sharing.
- Course structured data using Schema.org Course/Offer markup.
- Search indexing enabled for public pages.
- Certificate verification pages excluded from search indexing.
- Secure remote HTTPS course images/media permitted by CSP.
- Polished public homepage.
- Polished 404 experience.
- Responsive public sections.

## Privacy and cache behavior

The service worker intentionally does not cache API, admin, dashboard, learning, checkout, authentication, or password-reset routes.

## Deployment retry

Triggered a fresh preview deployment after Vercel space/quota was cleared.

## Final verification

Before merging:

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:integration
```

Manual QA:
- Install on iPhone using Add to Home Screen.
- Install on Android/desktop through the browser install prompt.
- Confirm the app launches in standalone mode.
- Confirm public pages work after a temporary network loss once previously visited.
- Confirm authenticated/private pages are not served from the service-worker cache.
- Open /robots.txt and /sitemap.xml.
- Validate a published course page title, description, canonical URL, and social metadata.
- Validate course structured data.
- Check public homepage/course pages at mobile widths.

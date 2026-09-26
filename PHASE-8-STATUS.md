# Phase 8 — Launch readiness and operations

Branch: `phase8-launch-readiness`

## Scope

Phase 8 turns the completed academy into a launch-ready product with operational visibility.

## Implemented

- Admin launch-readiness page.
- Production configuration checks without exposing secret values.
- Admin-only system-health endpoint.
- Readiness percentage and per-service status.
- Checks for HTTPS APP_URL, MongoDB, auth secret, SMTP, production media storage, and live card-provider configuration.
- Unit tests for readiness logic.
- Expanded admin overview metrics.
- Launch checklist and final QA guidance.

## Verification before merge

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:integration
```

Manual QA should include:
- registration + MFA email
- login on a trusted and new device
- admin login
- course creation and publishing
- student purchase/manual grant
- USDT submission + admin approval
- course progress + resume
- certificate generation + public verification + PDF
- PWA install on iPhone and Android
- robots.txt and sitemap.xml
- mobile and desktop layouts

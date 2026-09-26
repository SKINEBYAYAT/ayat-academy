# Phase 2 status — course administration

Phase 2 is being developed on `phase2-course-admin` and does not alter the stable Phase 1 branch until it is verified.

## Implemented

- Admin-only course CRUD APIs and pages.
- Unlimited Course → Level → Section → Lesson hierarchy using separate MongoDB collections.
- Course create/edit/delete, draft/published/featured flags, pricing, instructor information, requirements, learning outcomes, certificate toggle, slug validation, and duplicate-course support.
- Course search/filter and persistent Move Up / Move Down ordering.
- Level/section/lesson create/edit/delete and persistent ordering.
- Server-side hierarchy checks prevent attaching a section/lesson across the wrong course/parent.
- Cascade deletion removes nested lessons/sections/levels when their parent is deleted.
- Course duplication creates new IDs, a unique slug, and draft copies of nested content.
- Lesson text is stored as Markdown text rather than unsafe raw HTML.
- Lesson video picker and lesson resource attachment picker.
- Resource titles can be renamed or removed before lesson save.
- Development media adapter writes to ignored `public/uploads/` only outside production.
- Production media uploads deliberately fail closed until a cloud provider adapter is configured.
- Responsive admin navigation, cards, forms, content builder, confirmation dialogs, status badges, and mobile layouts.
- Phase 2 validation/model tests added.

## Media requirement before production

The current media layer is intentionally provider-neutral. Production needs a real storage/video provider before the academy can launch uploads.

Recommended split:
- Images/documents: object storage or managed media storage.
- Course videos: a private video platform with signed/authenticated playback.

Do not store large media binaries in MongoDB.

## Verification commands

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:integration
```

Phase 3 (student course player/progress) must not begin until these checks pass and the admin course builder is tested manually on mobile and desktop.

# Phase 3 status — student learning experience

Development branch: `phase3-student-learning`

## Implemented

- Student dashboard with My Courses cards.
- Enrollment-based course visibility.
- Admin course-access grant/revoke screen.
- Server-side course-access enforcement.
- Published-only learning tree for students.
- Course player with Level → Section → Lesson navigation.
- Responsive learning sidebar.
- Continue Learning from the exact current lesson.
- Previous / Next lesson navigation.
- Mark Complete.
- Required-vs-optional lesson completion percentage.
- Course completion timestamp at 100% of required lessons.
- Video position persistence and resume.
- Lesson resources.
- Safe Markdown lesson rendering without raw HTML.
- Draft/unpublished levels, sections, and lessons excluded from student learning.
- Progress writes protected by session, course enrollment, published lesson checks, and same-origin validation.

## Still intentionally outside Phase 3

- Checkout and automatic paid enrollment.
- Whish Pay.
- Visa/card processing.
- USDT verification.
- Certificates.
- Production private media provider.

## Final verification

Before merging Phase 3:

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:integration
```

Manual QA:
- Grant a test student access in /admin/students.
- Confirm the course appears on /dashboard.
- Confirm an unenrolled student cannot open /learn/... directly.
- Complete lessons and confirm percentage updates.
- Confirm optional lessons do not block 100%.
- Start a video, leave, reopen it, and confirm it resumes.
- Check course player on desktop and mobile.

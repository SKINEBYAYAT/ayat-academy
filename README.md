# Ayat Academy — Phase 1

An incremental Next.js App Router / TypeScript / MongoDB foundation for the skincare academy. This repository currently implements **Phase 1 only**: accounts, authentication, roles, profile management, database schemas, and responsive account pages. Course management and all later phases have intentionally not been started.

## Run locally

1. Use Node.js 22 or newer (validated with Node 24).
2. Run `npm install` (or `npm ci` for the committed lockfile).
3. Copy `.env.example` to `.env.local` and provide the required values below.
4. Start a local MongoDB instance or configure MongoDB Atlas. The application database user must be allowed to create indexes.
5. Run `npm run dev` and open `http://localhost:3000`.
6. Create an administrator with `npm run admin:create`. This interactive command hides the password, creates only a new account, and refuses to overwrite/promote an existing account.

Public pages build without credentials. Authentication requires MongoDB and email configuration; there is no fake account, hardcoded login, or development OTP bypass.

## Environment

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Required MongoDB connection string. Never use the test database for business data. |
| `AUTH_SECRET` | Required, at least 32 cryptographically random characters. Generate locally, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Rotating this invalidates token lookups. |
| `APP_URL` | Required canonical origin, including scheme. Use `http://localhost:3000` locally and HTTPS in production. Must match the browser origin; do not set a path. |
| `EMAIL_PROVIDER` | Required: `smtp`. API email providers are not implemented. |
| `EMAIL_FROM` | Required sender address authorized by your email provider. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | Required SMTP service credentials. |
| `SMTP_PORT` | `587` by default with required STARTTLS; `465` uses implicit TLS. |
| `EMAIL_API_KEY` | Reserved placeholder only; unused by the SMTP adapter. |

Whish/card/video placeholders in `.env.example` are for future phases. No payment or video integration is claimed. No secret uses a `NEXT_PUBLIC_` variable.

## Pages and API

- `/register`, `/login`, `/verify`, `/forgot-password`, `/reset-password`
- `/dashboard`: authenticated account/profile placeholder
- `/admin`: authenticated administrator overview with live student/course counts
- `POST /api/auth/register|login|verify|resend|forgot|reset|logout`
- `GET/PATCH /api/profile`: only the current account; only the full name is editable
- `GET /api/admin/overview`: administrator only

Registration/reset requests require `passwordConfirmation`. Verification takes `challenge`, `code`, and optional `trustDevice`. Resend takes `challenge`. All mutations require JSON and the canonical `Origin` header.

## Architecture

```text
src/app/                  App Router pages, layouts, HTTP handlers
src/components/           Shared account UI and forms
src/lib/auth/             Validation, password/token hashing, sessions, OTP, rate limits
src/lib/db/               Cached MongoDB connection and Mongoose models
src/lib/email/            Server-only SMTP abstraction
src/lib/access.ts         Server-side course authorization for later phases
src/lib/config.ts         Explicit service configuration validation
src/lib/http.ts           CSRF origin checks, bounded JSON parsing, safe errors
scripts/create-admin.ts   Interactive, password-hidden admin bootstrap
tests/                    Unit and disposable-database integration tests
```

Models include User, Session, VerificationCode, TrustedDevice, RateLimit, Course, Level, Section, Lesson, Enrollment, CourseProgress, Order, Payment, Certificate, and AdminSettings. Course hierarchy records are separate collections, without a fixed number of courses/levels/sections/lessons. Monetary fields use minor units. Unique compound indexes protect enrollments, progress, certificate issuance, and payment event identity. Progress percentage will be derived from required lessons in the progress phase rather than stored as a potentially stale duplicate value.

## Security behavior

- bcrypt cost 12; passwords validated at 12+ characters and no more than 72 UTF-8 bytes.
- 256-bit opaque session/reset/device tokens; only HMAC-SHA256 digests stored. Codes use cryptographically secure random generation and keyed hashes.
- Codes/reset links expire in 10 minutes, with explicit expiry checks independent of MongoDB TTL cleanup. Login codes allow five attempts. Atomic consumption blocks concurrent replay.
- Resending rotates the code, requires 60 seconds since the last send, retains attempt counts, and does not extend the original challenge lifetime. Per-account and per-challenge delivery limits prevent unlimited resend chains.
- Administrators verify email on every login and receive one-hour sessions. Students receive seven-day sessions; trusted personal devices last 30 days and are bound to account version and user-agent hash. This detects untrusted devices, not a full behavioral risk engine.
- Cookies are HttpOnly, SameSite=Lax, and Secure with the `__Host-` prefix in production. Local HTTP development uses development-only cookie names.
- Password resets increment an account security version and remove sessions, trusted devices, and pending challenges. Role changes also invalidate old sessions. Neither registration nor profile APIs accept a caller-controlled role or account ID.
- New accounts cannot start a session until email verification succeeds. Duplicate registration returns an opaque generic challenge; existing users should sign in or reset their password. Forgot-password responses are generic whether an account exists or not.
- SMTP runs with Next.js `after()` so delivery latency/failure does not expose account existence. Configuration is checked before account lookup. Delivery errors are logged without recipient, token, or provider credentials; users can resend/retry. A durable email outbox is not implemented: abrupt infrastructure failure can require a retry.
- Database-backed account/IP rate limits work across application instances. Production IP isolation uses Vercel's overwritten `x-vercel-forwarded-for` header. Outside Vercel, requests deliberately share an IP bucket until a trusted proxy adapter is configured; arbitrary forwarded headers are never trusted.
- Origin checks, JSON-only mutations, 8 KiB streamed body limits, server-side ownership checks, and security headers apply. No untrusted HTML is rendered. The current CSP permits inline scripts/styles required by Next's static rendering; nonce-based CSP is a future hardening option.
- No production SMTP/MongoDB credentials are bundled. Tests cannot establish deliverability or production connectivity without those services.

## Verification

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:integration
```

Build before integration tests. The integration suite starts the production server and a disposable MongoDB, exercises page/API authorization and account flows, and destroys its database afterwards. It injects known code hashes into that isolated database to simulate email delivery; it does not send real email or validate an SMTP provider. Production cookies/HTTPS origin configuration are asserted using HTTP test-client headers against the local process.

`mongodb-memory-server` may download a MongoDB binary. To install dependencies without its optional postinstall download, set `MONGOMS_DISABLE_POSTINSTALL=1`; the binary is still needed when integration tests run. Set `MONGOMS_DOWNLOAD_DIR` to a writable cache folder if needed. No production MongoDB is used by these tests.

## Deploy to Vercel

Import this project with the Next.js preset, configure the required server environment values (HTTPS `APP_URL`), and allow Vercel to reach MongoDB and your SMTP service. The auth route has a 60-second execution limit for post-response email work. Initialize an admin using the same database environment from a trusted local terminal. Before accepting real accounts, test delivered verification/reset emails, DNS/sender authentication, HTTPS cookies, and MongoDB connectivity in the deployed environment.

Phase 2 must wait until the Phase 1 checks pass. Course CRUD, learning/player/progress, enrollment management, checkout/payment providers, certificates/PDFs, PWA, and the complete public marketing site remain later-phase work.
#   a y a t - a c a d e m y  
 
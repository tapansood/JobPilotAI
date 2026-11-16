# JobPilotAI

A calmer workspace for IT professionals navigating their next career move.

## Local setup

Requires Node.js 20 LTS, npm, and Docker with Compose.

```sh
cp .env.example .env
docker compose up -d db
npm i
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000. Sign in with email or an E.164 phone number (e.g. +14155552671). Without delivery credentials, the development server console prints the email link or SMS code. Email links require a confirmation click so mail scanners cannot consume them. Never expose this local development server publicly.

## Current scope

Landing page, email magic-link and phone OTP authentication, persistent sessions, and a protected dashboard. `/dashboard/resume` accepts PDF/DOCX resumes (5 MB maximum), extracts text, builds a profile, and lets you edit the headline, summary, skills, titles, locations, seniority, and years of experience. Jobs, Applications, Contacts, and Settings remain placeholders. Email and phone identities are separate accounts for now.

Files are signature-checked, with bounded DOCX archive expansion, then parsed using pdf-parse and Mammoth. Scanned/image-only and password-protected documents are unsupported. Uploading replaces the primary resume and parsed profile, including manual edits; previous uploads remain private on disk. Resume files live in `./uploads` (gitignored and never served publicly). The `FileStorage` interface supports replacing local disk with S3 later. Containers need a persistent writable `/app/uploads` mount owned by the app user. Local storage is not suitable for multi-instance deployment.

Without AI credentials, the mock provider uses deterministic section/skill/title/year heuristics. It extracts contact details internally without adding them to the profile or linking accounts. Heuristics are best-effort, not a substitute for review; unknown experience years remain blank. Real providers receive resume text, so configure them only with user consent. Parsed output is validated with Zod before persistence. `GET/PUT /api/profile` and multipart `POST /api/resume` are session-scoped; clients cannot choose a user ID.

## Configuration

See `.env.example` for every application setting:

- `DATABASE_URL`: Postgres connection string.
- `APP_URL`: trusted absolute site URL, used for email links, origin validation, and logout redirects.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: SMTP email delivery. Auth optional for local SMTP servers.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`: Twilio SMS REST delivery.
- `AI_PROVIDER`: `mock` (default, no credentials required), `openai`, or `anthropic`.
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`: provider credentials and model names. Explicitly selecting a real provider without its key fails rather than silently mocking.
- `NODE_ENV`: managed by Next.js; production enables secure cookies and disables console delivery.

Keep `.env` private. Production requires HTTPS, a correct `APP_URL`, real email/SMS delivery, and a private managed Postgres instance. Local Compose credentials are development-only. Secure production cookies are not sent over plain HTTP.

## Architecture

Next.js App Router + strict TypeScript + Tailwind. `src/app/api` contains backend route handlers; `src/lib/db.ts` owns Prisma; `src/lib/auth` handles delivery, token hashing, and transactional verification. Postgres 16 stores users, verification challenges, and sessions. Email tokens expire after 15 minutes, SMS codes after 10 minutes and at most five verification attempts. Issuing a new challenge invalidates previous challenges. Sends are limited to one per minute and five per hour per identifier using database transactions. Sessions expire after 30 days and are stored hashed; cookies are httpOnly and SameSite=Lax. Middleware rejects missing cookies and the dashboard server layout validates the actual database session. POST origin validation rejects cross-site browser requests.

`src/lib/ai` exposes `AIProvider.complete({system, prompt, json?})` with mock/OpenAI/Anthropic fetch adapters, used by `src/lib/profile/parse.ts` for schema-validated resume parsing. Planned modules include job feeds, tailoring, outreach drafts, and application tracking. AI output requires user review; no automatic applications or messages.

LinkedIn integration will use official user data exports and user-reviewed drafts, **not scraping, password collection, or automated messaging**.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
```

Vitest covers token utilities, authentication routes and services, and AI adapters. Tests mock external delivery and the database; use a local Postgres instance for full login smoke tests. CI runs lint, typecheck, tests, and a production build.

## Container / future AWS deployment

`docker build -t jobpilotai .` builds a multi-stage, non-root standalone Next.js image. Supply runtime environment settings using your deployment secret store. Apply migrations separately with `npx prisma migrate deploy` from a checkout with dependencies installed, before starting the app. The runtime image does not contain migration tooling. Later AWS deployment can use ECS/App Runner and RDS; no cloud resources are provisioned here.

Before production, add distributed IP/abuse protection, monitoring, retention/cleanup for expired tokens/sessions, backups, account recovery/linking, delivery verification, and a privacy policy. Per-identifier limits alone are not sufficient to prevent large-scale SMS/email abuse.

AI-powered job search copilot: resume-based job matching, per-job resume tailoring, and outreach drafting in one place.

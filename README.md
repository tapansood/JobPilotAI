# JobPilotAI

A calmer workspace for IT professionals navigating their next career move.

## Local setup

Requires Node.js 20.19+ (or a supported newer LTS), npm, and Docker with Compose.

```sh
cp .env.example .env
docker compose up -d db
npm i
npx prisma migrate dev
npx prisma generate
npm run dev
```

Open http://localhost:3000. Sign in with email or an E.164 phone number (e.g. +14155552671). Without delivery credentials, the development server console prints the email link or SMS code. Email links require a confirmation click so mail scanners cannot consume them. Never expose this local development server publicly.

## Feature overview

- Passwordless email/SMS sign-in with private, user-scoped data. Email and phone identities remain separate accounts.
- `/dashboard/resume`: signature-checked PDF/DOCX uploads (5 MB maximum), mock/live AI parsing, editable profile and resume contact details.
- `/dashboard/jobs`: aggregated job search, explainable scores, save/hide, factual tailored resumes, DOCX/PDF exports, cover letters and contact-matched outreach drafts.
- `/dashboard/contacts`: official LinkedIn Connections.csv imports and manual contacts.
- `/dashboard/applications`: keyboard-accessible six-column board, manual applications, status updates, notes, due/overdue follow-ups, linked document downloads and event timelines.
- `/dashboard`: live profile completeness, deduplicated visible matches, application counts by status and follow-ups due today.
- `/dashboard/settings`: integration configuration presence without exposing keys, identifiers, endpoints or other environment values.

Files are signature-checked, with bounded DOCX archive expansion, then parsed using pdf-parse and Mammoth. Scanned/image-only and password-protected documents are unsupported. Uploading replaces the primary resume and parsed profile, including manual edits; previous uploads remain private on disk. Resume files live in `./uploads` (gitignored and never served publicly). The `FileStorage` interface supports replacing local disk with S3 later. Containers need a persistent writable `/app/uploads` mount owned by the app user. Local storage is not suitable for multi-instance deployment.

Without AI credentials, the mock provider uses deterministic section/skill/title/year heuristics. Email, phone, LinkedIn URL, website and contact location are extracted from resume text, stored in Profile, editable on the Resume page and included in newly generated tailored resume exports. They never change sign-in identifiers or link accounts. Existing profiles are not backfilled from account identifiers: re-upload or fill contact fields, then regenerate old tailored drafts. Heuristics are best-effort, not a substitute for review; unknown experience years remain blank. Real providers receive resume text, so configure them only with user consent. Parsed output is validated with Zod before persistence. `GET/PUT /api/profile` and multipart `POST /api/resume` are session-scoped; clients cannot choose a user ID.

## Configuration

Copy `.env.example` to `.env`; do not commit secrets. Settings shows presence only, not whether credentials work. Restart after changing configuration. Explicitly selecting a real AI provider without its key fails instead of silently mocking.

| Variable             | Default / example                           | Purpose                                                                                                                                         |
| -------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Local Postgres URL in `.env.example`        | Required database connection; use private credentials and TLS in production.                                                                    |
| `APP_URL`            | `http://localhost:3000`                     | Trusted site origin for sign-in links, origin validation and logout; use HTTPS in production.                                                   |
| `AI_PROVIDER`        | `mock`                                      | `mock`, `openai`, or `anthropic`.                                                                                                               |
| `OPENAI_API_KEY`     | empty                                       | Required only for OpenAI; secret.                                                                                                               |
| `OPENAI_MODEL`       | `gpt-4o-mini`                               | OpenAI model name.                                                                                                                              |
| `ANTHROPIC_API_KEY`  | empty                                       | Required only for Anthropic; secret.                                                                                                            |
| `ANTHROPIC_MODEL`    | `claude-sonnet-4-20250514`                  | Anthropic model name.                                                                                                                           |
| `SMTP_HOST`          | empty                                       | SMTP delivery host; empty enables console email delivery in development only.                                                                   |
| `SMTP_PORT`          | `587`                                       | SMTP port.                                                                                                                                      |
| `SMTP_SECURE`        | `false`                                     | Set `true` for implicit TLS, typically port 465.                                                                                                |
| `SMTP_USER`          | empty                                       | SMTP username; authentication optional for local SMTP.                                                                                          |
| `SMTP_PASSWORD`      | empty                                       | SMTP password; secret.                                                                                                                          |
| `SMTP_FROM`          | `JobPilotAI <hello@example.com>` in example | Sender address; use a verified sender for production.                                                                                           |
| `TWILIO_ACCOUNT_SID` | empty                                       | Twilio account identifier.                                                                                                                      |
| `TWILIO_AUTH_TOKEN`  | empty                                       | Twilio token; secret.                                                                                                                           |
| `TWILIO_FROM`        | empty                                       | SMS sender in E.164 format. All three Twilio fields are needed; otherwise development uses console OTP delivery.                                |
| `ADZUNA_APP_ID`      | empty                                       | Adzuna app identifier; both Adzuna credentials enable the source.                                                                               |
| `ADZUNA_APP_KEY`     | empty                                       | Adzuna secret key.                                                                                                                              |
| `ADZUNA_COUNTRY`     | `us`                                        | Adzuna country endpoint.                                                                                                                        |
| `RAPIDAPI_KEY`       | empty                                       | RapidAPI JSearch key; enables JSearch.                                                                                                          |
| `GREENHOUSE_BOARDS`  | `stripe,cloudflare`                         | Comma-separated official public board tokens; empty disables Greenhouse.                                                                        |
| `LEVER_COMPANIES`    | `netflix`                                   | Comma-separated official public posting company identifiers; empty disables Lever.                                                              |
| `JOBS_MOCK`          | `false`                                     | `true` includes labeled demo jobs alongside configured sources. Also used automatically if no sources are configured, or all live sources fail. |
| `NODE_ENV`           | Managed by Next.js                          | Production enables secure cookies and disallows console delivery. Do not override for `npm run dev`.                                            |
| `HOSTNAME`           | `0.0.0.0` in Docker                         | Standalone container bind address, not the public site URL.                                                                                     |
| `PORT`               | `3000`                                      | Next.js / standalone listening port. Keep `APP_URL` consistent with your local port.                                                            |

For a fully offline demo, set `AI_PROVIDER=mock`, `GREENHOUSE_BOARDS=""`, `LEVER_COMPANIES=""`, `JOBS_MOCK=true`, and leave paid feed/delivery credentials empty. Local sign-in links/OTPs appear only in the private server console. Public board adapters use official APIs, not scraping.

## Job search and scoring

Create a resume profile first. Search defaults to your first profile title/location; clear location or use broader keywords if a board returns no matches. Greenhouse/Lever apply all query keywords and location substring matching locally and paginate in batches of 50. Adzuna/JSearch use provider pagination. Each request has a 15-second source timeout; individual source failures appear as notices without discarding other sources. Provider coverage and remote eligibility vary; verify the original listing. Greenhouse does not provide a reliable posting date in its public board payload, so that field remains unknown.

Jobs are upserted by source/external ID. Normalized company/title/location fingerprints remove cross-source duplicates from search responses and your match list. Searches add to existing matches and preserve saved/hidden status. The current UI searches page one; APIs accept pages 1–20. Job descriptions are converted to text and rendered as React text, never injected as HTML. Outbound links permit only HTTP(S).

Deterministic scoring uses recognized IT skill overlap (50 points), title keyword Jaccard similarity (25), seniority and explicit years requirement fit (15), and location/remote fit (10). Unknown experience/location earn neutral credit; jobs without recognized skills earn zero skill points. The detail page shows the breakdown. Scores are guidance, not hiring probabilities. Editing your profile affects scoring on your next search, not historical matches. `GET /api/jobs` supports `minScore`, `remote`, `source`, and `saved`; `PATCH /api/jobs/[jobId]` accepts `SAVED`, `HIDDEN`, or null. Hidden matches are excluded from the list. APIs and details are scoped to the current user's matches.

Keep `.env` private. Production requires HTTPS, a correct `APP_URL`, real email/SMS delivery, and a private managed Postgres instance. Local Compose credentials are development-only. Secure production cookies are not sent over plain HTTP.

## Tailoring, contacts, and outreach

Open a job detail and choose **Tailor resume**. The mock provider works without a key: it orders existing skills/bullets by JD relevance and highlights keywords already supported by each bullet. Changes show before/after wording. Keyword coverage is the percentage of recognized job skills present in the profile; reordering does not artificially increase it. Review, edit, and save before downloading through `GET /api/tailored/[id]/download?format=docx|pdf`. Exports are single-column text documents. PDF uses standard Latin fonts with ASCII transliteration; review international characters before use.

Both prompts and code prohibit fabricated employers, titles, dates, degrees, skills, or achievements. A conservative allowlist preserves profile identities/education and permits only original or deterministic factual headline/summary/bullet variants; unapproved AI wording is discarded. Edits can remove/reorder existing skills and approved bullets, not introduce arbitrary claims. For other factual corrections, edit your source profile and regenerate. Cover letters use a factual per-job template, with any unapproved AI text replaced by that template. Real AI providers receive profile and job text; review their privacy terms before enabling.

Import the official LinkedIn **Connections.csv** export in Contacts (raw `text/csv` to `POST /api/contacts/import`). Notes/preamble and quoted fields are supported; all seven official columns are required. Limits: 2 MB and 5,000 rows. Invalid imports are rejected, not partially saved. Contacts with the same name and normalized company are upserted per user; this can merge namesakes. Manual contact entry also upserts. Company matching ignores case, punctuation, and Inc/LLC/Corp/Ltd suffixes; it does not infer subsidiaries or employers with different names.

**Who do I know here?** shows same-company contacts. **Draft outreach** produces a LinkedIn connection/referral note (at most 300 characters), a referral email for each contact, and a recruiter/hiring-manager cold email even without contacts. Copy text, open a prefilled `mailto:` draft, or open a contact’s LinkedIn profile; the user reviews and sends manually. Repeated generation stores new draft history. Import only contacts you have permission to use. Every contact, tailored resume, cover letter, download, and outreach API is session-scoped. Nothing is automatically applied or sent.

## Application tracker

From a job detail, **Track application** creates a SAVED record (or updates an existing record's linked drafts without downgrading its status). **Mark applied** records an external submission; it does not apply for you. These actions link the latest prepared resume/cover letter if available. Saving a job from the Jobs page also creates a SAVED application, without resetting an existing application's progress. Hiding or unsaving a job does not delete its application.

The application board has SAVED, APPLIED, INTERVIEW, OFFER, REJECTED and WITHDRAWN columns. Use each card's labeled status dropdown with a keyboard; drag-and-drop is not required. Manual add supports jobs found elsewhere without a profile or aggregated Job. Open a card to edit company/title/URL, notes, applied date, follow-up date and document links, download a resume as DOCX/PDF or cover letter as TXT, review the timeline, or delete the application and its events. Document choices show the latest 100 owned drafts, restricted to the linked job when present. Downloaded documents are saved snapshots, not live versions of your profile.

On entering APPLIED, a missing applied date defaults to now and an unset follow-up defaults to seven days later. Explicit follow-up dates or API `null` override this default. Existing applied dates and scheduled follow-ups survive later status moves. All six statuses can be selected to correct history; repeated status updates do not create duplicate events. Status, notes and follow-up changes write STATUS_CHANGE, NOTE and FOLLOW_UP events transactionally. Notes events preserve the updated text; clearing notes is recorded. Due-today/overdue badges and dashboard counts use UTC calendar dates and exclude REJECTED/WITHDRAWN. Reminders are visual only; no notifications or automated messages are sent.

| API                                    | Behavior                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/applications`                | Current user's applications; optional `?jobId=` filter.                                                                                       |
| `POST /api/applications`               | Create a manual application with company/title, or create/update by owned `jobId`; returns 201 for new records, 200 for existing job records. |
| `GET /api/applications/[id]`           | Owned application, chronological events and owned document choices.                                                                           |
| `PATCH /api/applications/[id]`         | Update supplied fields; ISO timestamps with timezone or null for date fields. Linked job cannot be changed.                                   |
| `DELETE /api/applications/[id]`        | Delete owned application and cascade its events; preserves jobs and documents.                                                                |
| `GET /api/cover-letters/[id]/download` | Owned cover letter TXT download.                                                                                                              |

All APIs enforce session ownership, including job and document links. PostgreSQL enforces unique `(userId, jobId)` for non-null jobs while allowing multiple manual applications with null jobs. Per-user transactional locking serializes writes and event creation. Deleting a linked job/document sets the reference to null while preserving the application snapshot. Dashboard completeness checks ten filled core/contact fields, not resume quality; visible match counts deduplicate fingerprints and omit hidden postings.

## Architecture

Next.js App Router + strict TypeScript + Tailwind. `src/app/api` contains backend route handlers; `src/lib/db.ts` owns Prisma; `src/lib/auth` handles delivery, token hashing, and transactional verification. Postgres 16 stores users, verification challenges, and sessions. Email tokens expire after 15 minutes, SMS codes after 10 minutes and at most five verification attempts. Issuing a new challenge invalidates previous challenges. Sends are limited to one per minute and five per hour per identifier using database transactions. Sessions expire after 30 days and are stored hashed; cookies are httpOnly and SameSite=Lax. Middleware rejects missing cookies and the dashboard server layout validates the actual database session. POST origin validation rejects cross-site browser requests.

`src/lib/ai` exposes `AIProvider.complete({system, prompt, json?})` with mock/OpenAI/Anthropic fetch adapters, used for schema-validated resume parsing and constrained tailoring/cover letters. `src/lib/jobs/sources` holds job adapters and `src/lib/jobs/match.ts` provides pure scoring. `src/lib/tailor` validates factual content and exports documents; `src/lib/contacts` handles CSV/upserts/company matching; `src/lib/outreach` builds deterministic drafts; `src/lib/applications` owns tracker validation, transition/events, transactional persistence and dashboard statistics. AI output requires user review; no automatic applications or messages. Next.js 16 uses `src/proxy.ts` for the cookie-presence gate; Prisma 7 uses `prisma.config.ts` and the Postgres driver adapter.

LinkedIn integration uses official user data exports and user-reviewed drafts, **not scraping, password collection, or automated messaging**.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
```

Vitest covers auth, parsing/extraction, source adapters, scoring/deduplication, factual tailoring, export file validity, contacts/outreach, tracker transitions/events/follow-ups and API ownership. Tests mock external delivery and the database; use local Postgres for full login and application CRUD smoke tests. CI runs lint, typecheck, tests, and a production build.

## Container / future AWS deployment

`docker build -t jobpilotai .` builds a multi-stage, non-root standalone Next.js image. This is a future deployment outline, not deployed infrastructure:

1. Provision **RDS PostgreSQL** in private subnets, with backups, encryption, restricted security groups and TLS. Supply `DATABASE_URL` through Secrets Manager/SSM, never an image or public config file.
2. Implement an **S3 storage adapter** for `src/lib/storage`'s `put/get/remove` interface before multi-instance or ephemeral hosting. The current implementation is local disk only; there are intentionally no active S3 environment settings yet. Use private buckets, encryption, lifecycle/retention rules and an IAM task role with least privilege. Until then, local/one-instance containers require a persistent writable `/app/uploads` mount owned by the app user. **App Runner's ephemeral filesystem is not suitable for current local uploads.**
3. Build the existing Dockerfile, publish the image to ECR, and run via **ECS/Fargate** or **App Runner** with appropriate RDS networking, environment secrets, health checks, TLS and `APP_URL`. Apply migrations separately with `npx prisma migrate deploy` from a checkout/build job containing dependencies before starting the app. The runtime image does not include migration tooling. Avoid concurrent schema-changing releases; back up and plan rollback before migrations.
4. **SES SMTP** is an alternative to another SMTP vendor using the existing SMTP adapter: verify senders/domain, leave the sandbox as needed and configure SES SMTP credentials. **SNS SMS** is an alternative to Twilio only after implementing a new SMS delivery adapter; it is not currently selectable by an env variable. Account for opt-in, geographic restrictions, deliverability and abuse controls for either provider.
5. Configure CloudWatch/application monitoring, secret rotation, privacy/consent, retention and backups. No AWS resources, automated notifications or cloud deployment are created by this repository.

Before production, add distributed IP/abuse protection, monitoring, retention/cleanup for expired tokens/sessions, backups, account recovery/linking, delivery verification, and a privacy policy. Per-identifier limits alone are not sufficient to prevent large-scale SMS/email abuse.

AI-powered job search copilot: resume-based job matching, per-job resume tailoring, and outreach drafting in one place.

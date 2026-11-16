# JobPilotAI

A calmer workspace for IT professionals navigating their next career move.

## Local setup

Requires Node.js 20.19+ (or a supported newer LTS), npm, and Docker with Compose.

```sh
cp .env.example .env
docker compose up -d db
npm i
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000. Sign in with email or an E.164 phone number (e.g. +14155552671). Without delivery credentials, the development server console prints the email link or SMS code. Email links require a confirmation click so mail scanners cannot consume them. Never expose this local development server publicly.

## Current scope

Landing page, email magic-link and phone OTP authentication, persistent sessions, and a protected dashboard. `/dashboard/resume` accepts PDF/DOCX resumes (5 MB maximum), extracts text, builds a profile, and lets you edit the headline, summary, skills, titles, locations, seniority, and years of experience. `/dashboard/jobs` aggregates jobs and scores their fit to your profile. Job details offer tailored resumes, DOCX/PDF exports, cover letters, matched contacts, and outreach drafts. `/dashboard/contacts` imports LinkedIn connections and supports manual contacts. Applications and Settings remain placeholders. Email and phone identities are separate accounts for now.

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
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` (default `us`): optional Adzuna jobs API.
- `RAPIDAPI_KEY`: optional JSearch API via RapidAPI.
- `GREENHOUSE_BOARDS`, `LEVER_COMPANIES`: comma-separated public board identifiers (defaults: `stripe,cloudflare` and `netflix`). An empty string disables that board family. The adapters use official public APIs, not scraping.
- `JOBS_MOCK=true`: include clearly labeled synthetic demo postings alongside live sources. With no configured sources, or when all live sources fail, demo postings are used automatically. For fully offline use, set both board lists empty and leave paid API keys empty.

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

## Architecture

Next.js App Router + strict TypeScript + Tailwind. `src/app/api` contains backend route handlers; `src/lib/db.ts` owns Prisma; `src/lib/auth` handles delivery, token hashing, and transactional verification. Postgres 16 stores users, verification challenges, and sessions. Email tokens expire after 15 minutes, SMS codes after 10 minutes and at most five verification attempts. Issuing a new challenge invalidates previous challenges. Sends are limited to one per minute and five per hour per identifier using database transactions. Sessions expire after 30 days and are stored hashed; cookies are httpOnly and SameSite=Lax. Middleware rejects missing cookies and the dashboard server layout validates the actual database session. POST origin validation rejects cross-site browser requests.

`src/lib/ai` exposes `AIProvider.complete({system, prompt, json?})` with mock/OpenAI/Anthropic fetch adapters, used for schema-validated resume parsing and constrained tailoring/cover letters. `src/lib/jobs/sources` holds job adapters and `src/lib/jobs/match.ts` provides pure scoring. `src/lib/tailor` validates factual content and exports documents; `src/lib/contacts` handles CSV/upserts/company matching; `src/lib/outreach` builds deterministic drafts. Application tracking is planned. AI output requires user review; no automatic applications or messages. Next.js 16 uses `src/proxy.ts` for the cookie-presence gate; Prisma 7 uses `prisma.config.ts` and the Postgres driver adapter.

LinkedIn integration uses official user data exports and user-reviewed drafts, **not scraping, password collection, or automated messaging**.

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

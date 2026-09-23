# Calendly — Interview Scheduling Platform

Calendly is the interview scheduling application for the AWS LPU recruitment ecosystem.

## Current phase

Phase 4 — Candidate scheduling experience. This phase adds secure bearer scheduling links, candidate-facing timezone/date/slot selection, review state, and a read-only handoff to Phase 5 booking. No slot is reserved or confirmed.

## Architecture

```text
Recruitment Portal
	|
	| future integration
	v
Calendly
	|
	v
AWS LPU SSO
```

Calendly does not replace the SSO identity provider and does not modify the Recruitment Management Portal or SSO projects. The shared Supabase `profiles` table is the identity source of truth; Calendly does not create a duplicate `users` table. Scheduling foreign keys use `profiles.id` directly.

## Authentication

1. `/login` redirects to the existing SSO `/authorize` endpoint.
2. Calendly stores HTTP-only `state`, `nonce`, and PKCE verifier cookies.
3. `/auth/callback` exchanges the authorization code at `/oauth/token`.
4. Calendly validates the RS256 ID token, including issuer, audience, and nonce.
5. Calendly calls `/oauth/userinfo` and provisions or updates the local user by `sso_user_id`.
6. The access token is stored in the HTTP-only `calendly_access_token` cookie.

Access tokens are never stored in localStorage or exposed to browser JavaScript. Protected requests validate the token through SSO userinfo.

## Environment variables

Copy `.env.example` to `.env.local`:

- `NEXT_PUBLIC_APP_URL`: Local or deployed Calendly URL.
- `AWS_LPU_CLIENT_ID`: Registered SSO client ID.
- `AWS_LPU_CLIENT_SECRET`: Server-only SSO client secret.
- `AWS_LPU_REDIRECT_URI`: Registered callback, usually `http://localhost:3000/auth/callback` locally.
- `SSO_ISSUER`, `SSO_AUTHORIZE_URL`, `SSO_TOKEN_URL`, `SSO_USERINFO_URL`, `SSO_JWKS_URL`: Existing SSO endpoints and issuer.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Reserved for future browser-safe usage.
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only key for user provisioning.
- `CALENDLY_ROLE_MAP`: Optional JSON mapping from SSO roles to Calendly roles. Unmapped roles always default to `CANDIDATE`; for example `{"admin":"ADMIN","core":"RECRUITER","member":"CANDIDATE"}`.
- `RECRUITMENT_INTEGRATION_SECRET`: Server-to-server Bearer credential used only by the Recruitment Portal integration.

Apply [`supabase/schema.sql`](supabase/schema.sql) to the shared Supabase project after the SSO `profiles` table exists. Calendly expects `profiles.id`, `profiles.full_name`, `profiles.email`, `profiles.avatar_url`, and `profiles.role` from the existing SSO schema.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Register `http://localhost:3000/auth/callback` for the Calendly OAuth client in AWS LPU SSO. Never commit `.env.local` or credentials.

## Recruitment integration

The Recruitment Management Portal remains the source of truth for candidates, applications, jobs, and shortlisting. Calendly stores only a scheduling request and a minimal candidate snapshot. The Recruitment Portal currently exposes `applicationId`, `fullName`, `universityEmail`, `personalEmail`, `preferredRole`, and `status`; it has no separate candidate ID, job ID, or interview field, so the integration contract requires explicit `candidateId` and `jobId` values from the caller and does not read Google Sheets directly.

```text
Recruitment Portal
			 |
			 | POST /api/integrations/recruitment/interview-requests
			 v
Calendly
```

### Endpoint

`POST /api/integrations/recruitment/interview-requests`

Authentication uses `Authorization: Bearer $RECRUITMENT_INTEGRATION_SECRET`. This secret is server-only and is never accepted from browser sessions. Every request must also include an `Idempotency-Key` header. The key is stored as `external_request_id` with a database uniqueness constraint, so retries return the original request instead of creating duplicates.

Required JSON fields: `applicationId`, `candidateId`, `candidateName`, `candidateEmail`, `jobId`, `jobTitle`, `roundName`, and `durationMinutes`. Valid durations are `15`, `30`, `45`, `60`, `90`, and `120` minutes.

Successful responses return `{ "success": true, "data": { "id", "applicationId", "status" } }`. New requests return `201` with `PENDING`; idempotent retries return `200`. Invalid input returns `400` with `VALIDATION_ERROR`, missing/incorrect integration credentials return `401`, and unexpected database errors return `500`.

### Local integration test

Set `RECRUITMENT_INTEGRATION_SECRET` in `.env.local`, then use placeholder data:

```bash
curl -X POST http://localhost:3000/api/integrations/recruitment/interview-requests \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer $RECRUITMENT_INTEGRATION_SECRET" \
	-H "Idempotency-Key: APP-12345-TECHNICAL" \
	-d '{
		"applicationId": "APP-12345",
		"candidateId": "candidate-123",
		"candidateName": "John Doe",
		"candidateEmail": "john@example.com",
		"jobId": "JOB-42",
		"jobTitle": "Software Engineer Intern",
		"roundName": "Technical Interview",
		"durationMinutes": 60
	}'
```

Recruiters and admins can review requests at `/interview-requests` and open a pending request. The operation is `POST /api/interview-requests/:id/open` and permits only `PENDING -> OPEN`; all other transitions are rejected.

## Availability and panels

- `/availability` lets interviewers, recruiters, and admins manage their own recurring windows and date exceptions.
- `/panels` lets recruiters/admins create panels and manage members. Interviewers can view panels they belong to.
- `/scheduling/preview` is a recruiter/admin-only, read-only slot preview.
- `GET /api/availability` and `POST /api/availability` manage recurring rules.
- `PATCH|DELETE /api/availability/:id` update or remove a rule.
- `GET|POST /api/availability/exceptions` manage dated exceptions.
- `DELETE /api/availability/exceptions/:id` removes an exception.
- `GET|POST /api/panels`, `GET|PATCH|DELETE /api/panels/:id`, and the panel member endpoints manage panels.
- `GET /api/scheduling/slots?panelId=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&duration=60&timezone=Asia/Kolkata&interval=30` returns available combinations without reserving anything.

Recurring `day_of_week` uses `0 = Sunday` through `6 = Saturday`. Availability is stored as local `HH:mm` windows plus an IANA timezone such as `Asia/Kolkata`, `America/New_York`, `Europe/London`, or `UTC`. Luxon converts windows to UTC for overlap checks and preserves the requested timezone for output, including DST transitions.

The slot engine checks each interval at the configured 30-minute default. A slot must fit completely inside each selected interviewer's effective availability. Unavailable exceptions subtract time; special available exceptions replace recurring windows for that date. When a panel requires multiple interviewers, the engine returns deterministic combinations of the eligible members whose windows overlap.

## Candidate scheduling links

Recruiters/admins can generate a link from `/interview-requests/:id` after opening a request. Calendly creates 32 random bytes, returns the raw token only in the generation response, and stores only its SHA-256 hash in `scheduling_links`. Generating a new link revokes the previous active link. Links expire after `SCHEDULING_LINK_EXPIRY_DAYS` (default 7) and can be revoked. The public flow never requires SSO.

- `GET /api/public/scheduling/:token` returns only candidate name, position, round, duration, availability window, and expiry.
- `GET /api/public/scheduling/:token/slots?date=YYYY-MM-DD&timezone=Asia/Kolkata` returns date slots without interviewer identities or internal IDs.
- `/schedule/:token` provides the candidate UI. It detects the browser IANA timezone, allows changing it, shows available dates/times, and keeps selection only in frontend state.
- Public endpoints use a lightweight in-memory per-process rate limit. A distributed limiter is deferred until deployment topology requires it.

`PENDING`, expired, revoked, used, cancelled, and other non-`OPEN` requests all receive the same generic invalid/unavailable response. Scheduling links are bearer credentials; they must not be placed in logs or shared publicly.

## Google Calendar integration (Phase 6)

Google Calendar is an optional interviewer/recruiter integration. Candidates never connect Google or provide Google credentials. Authenticated Calendly users connect through `/api/integrations/google/connect` using OAuth 2.0 and the least-privilege `https://www.googleapis.com/auth/calendar.events` scope. The callback validates a short-lived HTTP-only state cookie and stores encrypted access/refresh tokens in `google_calendar_connections`; tokens never reach the browser, URLs, logs, or audit records.

Use `.env.example` to configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_TOKEN_ENCRYPTION_KEY`. Enable Google Calendar API, configure the OAuth consent screen, and register the exact callback URI. `.env.local` is intentionally not modified by this phase.

Connected users can list/select calendars through `/api/integrations/google/calendars`. Free/busy is normalized through `/api/integrations/google/freebusy` without exposing event titles or descriptions. After a successful booking transaction, Calendly triggers a separate sync service that creates one Google Calendar event with a Google Meet conference, candidate/interviewer attendees from canonical records, and the interview's absolute UTC instant plus IANA timezone.

Interview booking remains successful if Google is unavailable. `interviews.calendar_sync_status` is `PENDING`, `SYNCED`, or `FAILED`; failures store only normalized error codes. Recruiters/admins can retry via `POST /api/interviews/:id/calendar-sync`. Event creation is idempotent by stored `google_event_id` and a deterministic Google conference request ID.

Phase 6 does not add a durable queue, external-calendar slot replacement, cancellation/rescheduling, email, reminders, or other providers. The current post-response application trigger is suitable for local/single-instance operation; a durable job queue can be introduced later.

## Phase 4 exclusions

Booking, reservations, slot locks, calendar providers, Google Meet, Outlook, Apple Calendar, WhatsApp, email notifications, reminders, rescheduling, cancellation, feedback, analytics, queues, Redis, Kafka, BullMQ, and AI scheduling are reserved for later phases.

## Notification Architecture

The system handles notifications asynchronously without blocking the booking transaction. Interview booking does not depend on successful notification delivery.

* **Notification Table**: Durable queue-like table `notifications` storing email tasks with idempotency keys (`interview_id`, `recipient_email`, `type`).
* **Notification Provider**: Abstraction via `NotificationProvider` currently implemented by `SsoMailProvider` that contacts the existing SSO Mail API (`POST /api/v1/mail/send`).
* **Booking Confirmation**: Immediate dispatch for both the candidate and assigned interviewers upon successful booking.
* **Reminder Schedule**: Pre-computes and inserts 24h, 1h, and 10m reminders. Reminders that are already past-due relative to the current booking time are skipped.
* **Retry Strategy**: Failed notifications increment `attempt_count` with an exponential backoff retry strategy (1m, 5m, 15m), max 3 retries (4 attempts total), then transition to `FAILED`.
* **PostgreSQL Locking**: Prevents concurrent execution via `FOR UPDATE SKIP LOCKED` during notification claim to ensure exactly-once processing among active workers.
* **Idempotency**: Provided database unique constraints, duplicate notification types for the same recipient and interview are rejected.
* **Notification Preferences**: Interviewers can disable notifications; candidates receive required transactional emails.
* **Timezone Behavior**: Scheduling logic relies exclusively on UTC. Timezone differences are evaluated and displayed strictly at rendering time for emails.
* **Failure Behavior**: An email failure pauses that specific notification but does not roll back the booking or other notifications.

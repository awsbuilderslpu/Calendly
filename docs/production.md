# Production Documentation

## Environment Variables
Ensure all required environment variables are set. `lib/config/env.ts` will validate the presence of core secrets upon startup in `NODE_ENV=production`.
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLIENT_SECRET`
- External Integrations: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `WHATSAPP_API_TOKEN`, etc.

## Database Setup & Migrations
PostgreSQL/Supabase holds the authoritative state.
1. Run `supabase/schema.sql`.
2. Indexes have been tuned for Analytics. (e.g. `interviews_starts_at_idx`).
3. Backups: Utilize Supabase's built-in Point-in-Time Recovery (PITR).

## OAuth & Integrations
- **Google**: Configured via standard OAuth flow.
- **Microsoft**: Configured with `offline_access` and `Calendars.ReadWrite` scopes.
- **WhatsApp**: Requires a WhatsApp Business API connection. Fails gracefully.

## Security
- Content-Security-Policy (CSP) is strictly enforced via `next.config.ts`.
- Frame-Ancestors/X-Frame-Options set to DENY.
- Rate limiting is memory-bound (or delegated to PG connections).
- Public APIs are obscured behind crypto-safe tokens, avoiding direct DB sequence exposure.

## Health Checks
- `GET /api/health`: Generic Liveness.
- `GET /api/health/ready`: Deep Readiness checking database connectivity.

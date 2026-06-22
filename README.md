# AgentReady

AgentReady is a contact-sales SaaS for scanning, validating, generating, and monitoring website AI-readiness metadata and `llms.txt` files.

## What works

- Secure public-site crawler with redirect checks, response limits, sitemap discovery, deterministic scoring, context estimates, and `llms.txt` generation.
- Neon PostgreSQL persistence through `@neondatabase/serverless`, with automatic schema initialization and a local SQLite fallback.
- Email/password workspaces, signed 30-day sessions, password recovery, optional verified-email enforcement, and secure one-time account tokens.
- Responsive customer dashboard with dedicated Overview, Client Sites, Reports, Monitoring, and branded Settings pages.
- One guest scan per 24 hours, 3 free workspace credits, one-credit-per-scan accounting, and automatic failed-scan refunds.
- Private admin console at `/admin` for customer visibility and contact-sales credit allocation.
- Branded private reports, high-entropy public share links, and downloadable generated `llms.txt` files.
- Daily Vercel cron configuration for due weekly scans and optional Resend monitoring alerts.
- Contact-sales conversion through `jhaladevrajsinh11@gmail.com`; no payment gateway.

## Local setup

1. Create a project at [Neon](https://console.neon.tech/) and copy its pooled PostgreSQL connection string.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` and replace `SESSION_SECRET`, `CRON_SECRET`, and `ADMIN_SECRET` with separate random values.
4. Run `npm install` and `npm run dev`.
5. Open [http://localhost:3000](http://localhost:3000).

The app creates and migrates its tables on the first database-backed request. If `DATABASE_URL` is omitted, development falls back to `.data/agentready.db`; production should always use Neon.

Check `GET /api/health/database`. A production-ready connection returns `{ "ok": true, "database": "neon" }`.

## Customer and credit flow

- Guest visitors receive one public scan every 24 hours.
- Every new workspace receives 3 scan credits.
- Manual and scheduled scans consume one credit and refund it if crawling fails.
- Empty balances pause scanning and direct the customer to Contact Sales.
- Sign into `/admin` with `ADMIN_SECRET` to review workspaces and allocate purchased credits.

The existing `POST /api/admin/credits` endpoint remains available for automation with `Authorization: Bearer <ADMIN_SECRET>`.

## Email and account recovery

Set `RESEND_API_KEY` and a verified `ALERT_FROM_EMAIL` sender to enable:

- Password reset emails.
- Email verification links.
- Monitoring alerts when readiness changes or credits run out.

Keep `REQUIRE_EMAIL_VERIFICATION=false` until Resend is configured. Change it to `true` in production when verified email should be mandatory at login.

## Scheduled monitoring

`vercel.json` calls `GET /api/cron/monitor` daily at 06:00 UTC. Vercel supplies `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is configured.

Other hosting schedulers can call either `GET` or `POST /api/cron/monitor` with the same bearer token. Each invocation processes up to five due sites.

## Production deployment

Vercel is the simplest deployment path for the included cron configuration. Add every value from `.env.example` to the deployment environment, set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin, and deploy.

The included Docker image can alternatively run on Railway, Render, Fly.io, or another Node 22 host; configure an external scheduler for `/api/cron/monitor` in that case.

## Product language

`llms.txt` remains an emerging proposal. AgentReady reports technical readiness and estimated context consumption; it does not promise AI crawling, citations, or rankings.

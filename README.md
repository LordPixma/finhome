# Finhome — Bankless Edition

This repository is currently in the Bankless Edition: live bank connections are deferred to a future phase. Data ingestion is via manual entry and file uploads (CSV/OFX/QIF), followed by AI-powered categorization, budgeting, bills, and analytics.

• If you’re looking for the full documentation, everything now lives under `Docs/`.

## Start here

- Quick overview: Docs/README.md
- Setup for local dev: Docs/SETUP.md
- Web app deployment: Docs/WEB_APP_DEPLOYMENT.md
- AI categorization implementation: Docs/AI_CATEGORIZATION_IMPLEMENTATION.md
- Database indexes overview: Docs/DATABASE_INDEXES_COMPLETE.md
- Project summary: Docs/PROJECT_SUMMARY.md
 - CI migrations: Docs/CI_MIGRATIONS.md

## What’s included in the Bankless Edition

- Manual transactions and file uploads (R2 + queued parsing)
- Categorization engine with confidence scoring
- Budgets, goals, bill reminders (Queues)
- Pre-aggregated analytics and trends

## What’s not included (Phase 2)

Bank connections and automatic transaction sync have been removed for now. If you need legacy notes or migration context, see:

- DEPRECATED: Docs/TRUELAYER_PRODUCTION_MIGRATION.md
- DEPRECATED: Docs/AUTOMATIC_TRANSACTION_SYNC_VERIFICATION.md

## Repo map

- Docs: All documentation and guides
- apps/api: Cloudflare Worker API (Hono, Drizzle ORM + D1, KV, R2, Queues)
- apps/web: Next.js 14 web application (App Router)
- packages/shared: Shared Zod schemas and TypeScript types

Questions or issues? Open an issue or PR. Contributions welcome.
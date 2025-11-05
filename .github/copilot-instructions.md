# Copilot instructions — Finhome (Family Budgeting SaaS)

This repository is a Turborepo monorepo for a multi-tenant **Family Budgeting & Financial Analysis SaaS** built entirely on Cloudflare's edge stack. Key services:
- `apps/api` — Hono Cloudflare Worker using Drizzle ORM + D1 (server API, file processing, queue consumers, AI categorization)
- `apps/web` — Next.js 14 (App Router) frontend with AI-powered categorization UI
- `packages/shared` — shared Zod schemas and TypeScript types

**Architecture**: Manual transaction entry + file uploads (CSV/OFX/QIF) → categorization engine → budgets/goals/bills → analytics & forecasting.

Read these first:
- `apps/api/src/index.ts` (worker entry, route registration, queue consumers)
- `apps/api/src/db/schema.ts` (Drizzle schema with 31 optimized indexes - core entities: tenants, users, accounts, transactions, categories, budgets, goals, billReminders)
- `apps/api/src/middleware/auth.ts` (JWT + tenant checks)
- `apps/api/src/services/categorization.ts` (AI/ML transaction categorization engine with merchant patterns & keyword matching)
- `apps/api/src/routes/files.ts` (file upload processing, CSV/OFX parsing, R2 storage)
- `packages/shared/src/schemas.ts` & `types.ts` (canonical Zod schemas & TypeScript types for batch categorization, stats, etc.)

Critical conventions (follow these exactly)
- **Multi-tenancy**: every persisted entity includes `tenantId`. Requests are scoped by subdomain. Use subdomain middleware (`subdomain.ts` / `subdomain-router.js`) to resolve tenant context and enforce tenantId in queries.
- **API envelope**: responses must be `{ success: boolean, data?: any, error?: { code: string, message: string } }`.
- **Auth**: JWT via `jose`. Access tokens are short-lived (~1h); refresh tokens are stored in KV (`SESSIONS`) for revocation. See `apps/api/src/middleware/auth.ts`.
- **Validation**: use Zod schemas from `packages/shared/src/schemas.ts` and the project `validateRequest()` pattern for body validation.
- **File processing**: Upload to R2 → Queue job → Parse CSV/OFX → Dedupe → Auto-categorize → Persist transactions. See `apps/api/src/routes/files.ts` and `apps/api/src/utils/fileParser.ts`.
- **Categorization**: Rule-based (keywords + merchant history) with confidence scoring (0-1). Auto-apply >0.8, suggest 0.5-0.8, manual <0.5. See `apps/api/src/services/categorization.ts`.

Common tasks (copyable examples)
```bash
# Start development (root)
npm run dev

# Add API route
# 1) create apps/api/src/routes/<name>.ts exporting a router
# 2) import and register it in apps/api/src/index.ts

# DB schema change
cd apps/api
npm run db:generate   # generate migration
npm run db:migrate    # apply to D1

# Tests
npm test              # runs across repo (turbo)
cd apps/api && npm test    # API unit tests (Vitest)
```

Key architectural patterns
- **File uploads**: `multipart/form-data` → R2 storage → queue-based parsing → transaction creation with categorization
- **AI categorization**: Batch processing with merchant pattern caching, keyword matching (423 lines), confidence scoring
- **Queue consumers**: Bill reminders, notification delivery, file processing jobs via `apps/api/src/index.ts` queue handlers
- **Analytics**: Pre-aggregated spending trends, category breakdowns, goal progress via `apps/api/src/routes/analytics.ts`
- **R2 storage**: Profile pictures, uploaded files, export jobs with signed URL access

Integration & implementation notes
- **Cloudflare bindings**: (D1, KV, R2, QUEUE, AI) configured in `apps/api/wrangler.toml` and `wrangler-subdomain.toml` — ensure env/secret values are available locally/CI
- **Queue pattern**: Declare consumers in `apps/api/src/index.ts` using `queue()`, follow existing bill reminder pattern for new async jobs
- **Performance**: 31 database indexes deployed, batch categorization, merchant pattern caching, efficient SQLite queries with composite indexes

Data model highlights
- **Core entities**: Tenant → Users → Accounts → Transactions (with categoryId, providerTransactionId for deduping)
- **Budgeting**: Category-based budgets with period rollover (weekly/monthly/yearly)
- **Goals**: Target amount/date tracking with contribution history
- **Bills**: Recurring bill registry with reminder cadence and status tracking
- Bank connections: Phase 2 (future). Current edition is bankless; remove/avoid banking code, routes, env vars.

Quick rules-of-thumb
- Never drop `tenantId` from persistent entities or queries
- Reuse `packages/shared` Zod schemas and types for API/web parity
- Maintain standardized error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `INTERNAL_ERROR`, `RATE_LIMIT_EXCEEDED`
- For file processing, always store in R2 first, then queue parsing job
- Use batch categorization for efficiency when processing multiple transactions

Need examples? I can expand with: route template, migration example, categorization service pattern, queue consumer setup, or file processing workflow.

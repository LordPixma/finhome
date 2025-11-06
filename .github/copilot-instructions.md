# Copilot instructions — Finhome (concise)

This repo is a Turborepo monorepo for a multi-tenant budgeting SaaS using Cloudflare Workers (Hono) + Drizzle (D1). Short, actionable guidance for automated code helpers:

1) Big picture (how things flow)
- apps/api: Cloudflare Worker (Hono) — routes, queue consumers, scheduled handlers. Entry: `apps/api/src/index.ts`.
- apps/web: Next.js 14 frontend (App Router).
- packages/shared: canonical Zod schemas and TS types used by both API and web (`packages/shared/src/schemas.ts`, `types.ts`).

2) Critical, non-negotiable conventions
- Multi-tenancy: every persisted row must include `tenantId`. Requests are scoped by subdomain (see `subdomain-router.js`). Never drop tenantId from queries.
- API envelope: all HTTP responses follow { success: boolean, data?: any, error?: { code: string, message: string } } (see `apps/api/src/index.ts` handlers).
- Auth: JWT via `jose`. Access tokens ~1h; refresh tokens stored in KV `SESSIONS`. See `apps/api/src/middleware/auth.ts` for tenant vs global-admin checks.
- Validation: reuse Zod schemas from `packages/shared/src/schemas.ts` and the project's validateRequest() pattern.

3) File processing & categorization (common workflow)
- Upload → store in R2 → enqueue parsing job → parse CSV/OFX (`apps/api/src/utils/fileParser.ts`) → dedupe → categorize (`apps/api/src/services/categorization.ts`) → persist. Examples in `apps/api/src/routes/files.ts`.
- Categorization confidence rules (implemented in services/categorization.ts): confidence > 0.8 = auto-assign, 0.5–0.8 = suggest, < 0.5 = manual.

4) Integration points to watch
- Cloudflare bindings: D1, KV, R2, QUEUE, AI — check `apps/api/wrangler.toml` and `wrangler-subdomain.toml` for required env bindings.
- Queues: consumers declared in `apps/api/src/index.ts` (exported `queue` function). Follow bill-reminder consumer pattern for new jobs.

5) How to add common things (concrete examples)
- Add API route: create `apps/api/src/routes/<name>.ts` exporting a Hono router, then register in `apps/api/src/index.ts` with `app.route('/api/<name>', router)`.
- DB changes: cd `apps/api` -> `npm run db:generate` then `npm run db:migrate` (D1 migrations used).

6) Dev & test quick commands
- Start local dev (root): `npm run dev` (turbo workspace). API unit tests: `cd apps/api && npm test` (Vitest).

7) Quick references (files to read first)
- `apps/api/src/index.ts` — worker entry, routes, queue handlers
- `apps/api/src/db/schema.ts` — Drizzle schema and indexes (transactions heavily indexed)
- `apps/api/src/middleware/auth.ts` — JWT + tenant/global admin behavior
- `apps/api/src/services/categorization.ts` — categorization logic and confidence thresholds
- `apps/api/src/routes/files.ts` & `apps/api/src/utils/fileParser.ts` — upload/parsing flow
- `packages/shared/src/schemas.ts` & `types.ts` — canonical input/output shapes

If you'd like, I can (a) generate a short route template, (b) add a test scaffold for the categorization service, or (c) expand examples for migrations/queue consumers. Tell me which and I’ll add it.

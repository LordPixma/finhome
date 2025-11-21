# Copilot instructions — Finhome (concise)

A focused guide for code assistants working in this Turborepo (Cloudflare Workers + Next.js + Drizzle).

1) Big picture — what to know first
- `apps/api`: Cloudflare Worker (Hono) — HTTP routes, queue consumers, scheduled jobs. Entry: `apps/api/src/index.ts`.
- `apps/web`: Next.js 14 (App Router) frontend that consumes the API and uses components under `apps/web/src/components` (see `ai` components for examples).
- `packages/shared`: canonical Zod schemas and TypeScript types used by API + web (`packages/shared/src/schemas.ts`, `types.ts`).

2) Non-negotiable conventions (follow these)
- Multi-tenancy: every persisted row and API operation must be scoped with `tenantId` (see `packages/shared/src/schemas.ts` and `subdomain-router.js`). Do not remove or ignore `tenantId` in queries.
- API envelope: all endpoints return { success: boolean, data?: any, error?: { code: string, message?: string } } — preserve this shape for handlers and clients (see `apps/api/src/index.ts`).
- Auth: JWT via `jose`. Refresh tokens live in KV `SESSIONS`. See `apps/api/src/middleware/auth.ts` for tenant vs global-admin behavior.
- Validation: reuse Zod schemas from `packages/shared` and the project's `validateRequest()` pattern (search codebase for `validateRequest`).

3) Data & async flows to reference
- File upload flow: Upload → R2 → enqueue parse job → parse CSV/OFX (`apps/api/src/utils/fileParser.ts`) → dedupe → categorize (`apps/api/src/services/categorization.ts`) → persist. See `apps/api/src/routes/files.ts` for wiring.
- AI categorization: confidence rules in `apps/api/src/services/categorization.ts` (auto >0.8, suggest 0.5–0.8, manual <0.5). Frontend components under `apps/web/src/components/ai` show client usage.
- DB: Drizzle + D1. Schema in `apps/api/src/db/schema.ts`. Migrations handled with `drizzle-kit` + `wrangler d1 migrations`.

4) Integrations and infra points
- Cloudflare bindings used: D1, KV, R2, QUEUE, AI — check `apps/api/wrangler.toml` and `wrangler-subdomain.toml` for binding names and env expectations.
- Queues: consumers are registered from `apps/api/src/index.ts` (exported `queue` function). Copy the bill-reminder consumer pattern when adding new jobs.

5) Common tasks & exact commands
- Start local dev (root monorepo): `npm run dev` (runs `turbo run dev`).
- Run API locally: `cd apps/api && npm run dev` (uses `wrangler dev`).
- Build API: `cd apps/api && npm run build` (`tsc`).
- Run tests: `npm test` at root (turbo runs all) or `cd apps/api && npm test` for API unit tests (Vitest).
- DB: `cd apps/api && npm run db:generate` then `npm run db:migrate` (applies D1 migrations via Wrangler).
- Deploy API: `cd apps/api && npm run deploy` (wrangler deploy).

6) Where to look for examples or patterns
- Add routes: create `apps/api/src/routes/<name>.ts` exporting a Hono router, then register in `apps/api/src/index.ts` with `app.route('/api/<name>', router)`.
- Use `packages/shared/src/schemas.ts` for request/response shapes and `packages/shared/src/types.ts` for TS types.
- AI endpoints and usage examples: `Docs/AI_CATEGORIZATION_IMPLEMENTATION.md`, `Docs/AI_CATEGORIZATION_DEPLOYMENT.md`, and `apps/web/src/components/ai`.

7) Safety, secrets, and production notes
- Never hardcode production keys. Production bindings and sensitive values belong in Wrangler toml / Cloudflare dashboard (see `wrangler-subdomain.toml` and `apps/api/wrangler.toml`).
- Follow the `PRODUCTION_DEPLOYMENT_CHECKLIST.md` when preparing releases (R2 bucket names, queues, D1 DB).

If any area is unclear or you want templates (route, consumer, or categorization test scaffold), tell me which and I will add a concrete snippet.

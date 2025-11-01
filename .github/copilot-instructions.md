# Copilot Instructions for Finhome

## Architecture Overview
This is a multi-tenant SaaS budgeting app built on Cloudflare's edge stack with a Turborepo monorepo structure:
- **API** (`apps/api`): Hono-based Cloudflare Workers API with Drizzle ORM + D1 SQLite
- **Web** (`apps/web`): Next.js 14 frontend with App Router and Tailwind CSS  
- **Marketing** (`apps/marketing`): Static marketing site deployed to root domain
- **Shared** (`packages/shared`): Common Zod schemas and TypeScript types

## Key Patterns & Conventions

### Multi-tenancy
All database entities include `tenantId` for tenant isolation. The API expects subdomain-based tenant routing (e.g., `acme.finhome360.com`). The `subdomain.ts` middleware extracts tenant context from subdomains, and `auth.ts` verifies JWT tokens contain matching tenantId.

### Authentication & Security
- JWT authentication using `jose` library (access tokens: 1h, refresh tokens: 7d)
- Passwords hashed with `bcryptjs` (10 rounds)
- Rate limiting via KV: auth endpoints (5/15min), API endpoints (100/15min)
- Refresh tokens stored in `SESSIONS` KV for revocation capability
- Auth middleware in `apps/api/src/middleware/auth.ts` verifies JWT and sets user context

### Type Safety & Validation
- Use Zod schemas from `packages/shared/src/schemas.ts` for all validation
- `validateRequest()` middleware validates request bodies against schemas
- Database schema in `apps/api/src/db/schema.ts` uses Drizzle ORM with SQLite
- All API responses follow `{ success: boolean, data?: any, error?: { code: string, message: string } }` format

### Development Workflow
```bash
# Start all services
npm run dev

# Database operations (API app)
cd apps/api
npm run db:generate    # Generate migrations from schema changes
## Copilot Instructions for Finhome

Purpose: get AI coding agents productive fast — understand architecture, conventions, and common edit paths.

Quick architecture
- Monorepo (Turborepo): apps/api (Hono Cloudflare Worker + Drizzle + D1), apps/web (Next.js 14 + App Router), packages/shared (Zod schemas/types).

Essential files to read first
- `apps/api/src/index.ts` — worker entry, route registration, and queue consumer.
- `apps/api/src/middleware/auth.ts` and `subdomain.ts` — tenant & JWT enforcement.
- `apps/api/src/db/schema.ts` — Drizzle schema (run migrations after edits).
- `apps/api/wrangler.toml` & `wrangler-subdomain.toml` — Cloudflare bindings (DB, KV, R2, QUEUE, AI).
- `packages/shared/src/schemas.ts` — canonical Zod schemas used across API + web.
- `apps/web/src/lib/api.ts` — frontend apiClient (auto-refresh tokens, handles 401→refresh).

Project-specific conventions (do not invent alternatives)
- Multi-tenancy: every persistent entity includes `tenantId`. Use `subdomain` middleware to resolve tenant context.
- API envelope: responses use { success: boolean, data?: any, error?: { code, message } }.
- Auth: JWT via `jose`; refresh tokens stored in KV `SESSIONS` for revocation. Respect token lifetimes (access 1h, refresh ~7d).
- Validation: use Zod from `packages/shared` and `validateRequest()` middleware to keep parity between client/server.
- Rate-limits: implemented using KV; keep same limits when adding endpoints (auth stricter than general API).

Common developer tasks (concrete steps)
- Add API route: create file under `apps/api/src/routes/`, export router and register it in `apps/api/src/index.ts`.
- DB schema change: edit `apps/api/src/db/schema.ts` then run:
	- `cd apps/api; npm run db:generate` (create migration)
	- `npm run db:migrate` (apply to D1)
- Run locally / tests:
	- Root development: `npm run dev` (Turborepo handles apps)
	- Run all tests: `npm test` (Turbo)
	- API tests: `cd apps/api && npm test` (Vitest)

Integration notes
- Cloudflare bindings (DB, KV, R2, QUEUE, AI) are declared in `apps/api/wrangler.toml` — ensure env secrets/bindings are available when running locally or in CI.
- Queue consumers: `queue()` in `apps/api/src/index.ts` processes bill reminders — follow existing pattern when adding queued work.

When editing please:
- Keep tenant isolation (always thread tenantId into queries).
- Reuse shared Zod schemas, and export new types from `packages/shared`.
- Preserve the standardized API envelope and error codes (`VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `INTERNAL_ERROR`, `RATE_LIMIT_EXCEEDED`).

If anything here is unclear or you want more prescriptive examples (route skeleton, migration example, or a small test), tell me which area and I will expand.

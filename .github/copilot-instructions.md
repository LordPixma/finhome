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
npm run db:migrate     # Apply migrations to D1

# Deploy to production
npm run build
npm run deploy --workspace=@finhome/api

# Testing
npm test              # Run all tests via Turbo
cd apps/api && npm test  # API-specific Vitest tests
```

### Cloudflare Services Integration
The API (`apps/api/wrangler.toml`) is configured for:
- **D1**: Primary SQLite database (binding: `DB`)
- **KV**: Session storage (`SESSIONS`) and caching (`CACHE`)
- **R2**: File storage for CSV/OFX uploads (`FILES`)  
- **Queues**: Bill reminders processing (`BILL_REMINDERS`)
- **Workers AI**: AI-powered categorization and insights (binding: `AI`)
- **Custom Domains**: API at `api.finhome360.com`, Web at `app.finhome360.com`

### File Structure Patterns
- Route handlers in `apps/api/src/routes/` export Hono router instances
- Middleware in `apps/api/src/middleware/` (auth, validation, rate limiting, CORS)
- All routes use `authMiddleware` and `tenantMiddleware` for protection
- Frontend components use Tailwind utility classes
- Shared validation schemas prevent duplication between API/frontend

### Common Tasks
- **Add new API endpoint**: Create route in `apps/api/src/routes/`, add to `src/index.ts`, apply auth middleware
- **Database changes**: Modify `apps/api/src/db/schema.ts`, run `db:generate`, then `db:migrate`
- **New shared types**: Add to `packages/shared/src/`, export from `index.ts`
- **Frontend features**: Use Next.js App Router in `apps/web/src/app/`
- **Add validation**: Create schema in `packages/shared/src/schemas.ts`, use `validateRequest()` middleware

### API Routes (Complete CRUD)
- `/api/auth` - Login, register, refresh (with rate limiting)
- `/api/accounts` - Account management
- `/api/categories` - Category management
- `/api/transactions` - Transaction management (includes AI auto-categorization)
- `/api/budgets` - Budget management
- `/api/bill-reminders` - Bill reminder management (auto-queues notifications)
- `/api/analytics` - Spending analytics with 6-month trends
- `/api/files` - CSV/OFX file upload for transaction import
- `/api/recurring-transactions` - Recurring transaction management
- `/api/goals` - Financial goal tracking with contributions
- `/api/settings` - User settings (currency, timezone, etc.)
- `/api/tenant-members` - Multi-user tenant management
- `/api/ai` - AI-powered features (categorization, insights, financial advice)
- `/api/banking` - Open Banking integration with TrueLayer
- `/api/profile` - User profile management with picture uploads
- `/api/tenant` - Tenant information and settings

### Queue Consumer Pattern
The `queue()` export in `apps/api/src/index.ts` processes bill reminder notifications. It fetches reminder details, sends notifications, updates statuses, and stores notifications in KV cache.

### API Client Pattern
Frontend uses `apps/web/src/lib/api.ts` with automatic token refresh on 401. All API calls go through `apiClient()` which handles JWT tokens, automatic refresh, and redirects to login on failure.

### Error Handling
All routes wrap logic in try-catch blocks with standardized error responses. Use specific error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `INTERNAL_ERROR`, `RATE_LIMIT_EXCEEDED`.

### AI-Powered Features
- **Transaction Categorization**: `apps/api/src/services/categorization.ts` with 200+ keywords and confidence scoring
- **Workers AI Integration**: `apps/api/src/services/workersai.service.ts` for insights and financial advice
- **Dual Email System**: `apps/api/src/services/hybridEmail.ts` - Resend (primary) + MailChannels (fallback)
- **Auto-categorization Algorithm**: Confidence-based (auto ≥0.8, suggest ≥0.5, manual <0.5)

### Banking Integration
- **TrueLayer**: Open Banking API integration in `apps/api/src/services/banking.ts`
- **Bank Connections**: Secure OAuth flow with refresh tokens stored in KV
- **Account Sync**: Automatic transaction import from connected bank accounts

### Email Notifications
- **Welcome Emails**: Sent on user registration with tenant-specific dashboard links
- **Bill Reminders**: Queue-processed notifications with HTML templates
- **Member Invitations**: Admin-triggered invites for multi-user tenants
- **Failover System**: Resend → MailChannels with DNS verification

### Transaction Categories & Data Model
The core entities are: `tenants` → `users`, `accounts`, `categories`, `transactions`, `budgets`, `billReminders`. All transactions link to accounts and categories with proper foreign key relationships. Extended with `recurringTransactions`, `goals`, `goalContributions`, `userSettings`, `tenantMembers`.

When implementing features, always consider tenant isolation and use the established Zod validation patterns from the shared package.
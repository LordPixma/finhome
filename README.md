# Finhome360 - Multi-tenant Budgeting SaaS

A comprehensive financial management platform with open banking integration, AI-powered categorization, budgeting, and analytics.

##  SECURITY & PRODUCTION - READ FIRST

** CRITICAL: Before deploying to production, you MUST:**

1. **Read**: [SECURITY_PRODUCTION.md](./SECURITY_PRODUCTION.md)
2. **Read**: [PRODUCTION_SECRETS_SETUP.md](./PRODUCTION_SECRETS_SETUP.md)
3. **Complete**: [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
4. **Review**: [SECURITY_REVIEW_SUMMARY.md](./SECURITY_REVIEW_SUMMARY.md)

**All hardcoded secrets have been removed. Production deployment requires proper secret configuration via `wrangler secret put`.**

##  Documentation

Full documentation is in the `Docs/` directory:

- **Quick Start**: [Docs/README.md](./Docs/README.md)
- **Local Development**: [Docs/SETUP.md](./Docs/SETUP.md)
- **Web Deployment**: [Docs/WEB_APP_DEPLOYMENT.md](./Docs/WEB_APP_DEPLOYMENT.md)
- **AI Categorization**: [Docs/AI_CATEGORIZATION_IMPLEMENTATION.md](./Docs/AI_CATEGORIZATION_IMPLEMENTATION.md)
- **Database Indexes**: [Docs/DATABASE_INDEXES_COMPLETE.md](./Docs/DATABASE_INDEXES_COMPLETE.md)

##  Features

### Core Functionality
-  Manual transaction entry and bulk import (CSV/OFX/QIF)
-  **Open Banking integration** (TrueLayer OAuth)
-  **Automated transaction sync** from bank accounts
-  **PDF bank statement parsing**
-  AI-powered categorization with confidence scoring
-  Budgets, goals, and bill reminders
-  Pre-aggregated analytics and trends
-  Multi-tenant architecture with subdomain routing

### Technical Stack
- **API**: Cloudflare Workers (Hono framework)
- **Database**: Drizzle ORM + D1 (SQLite)
- **Storage**: R2 (file uploads), KV (sessions, cache)
- **Queue**: Cloudflare Queues (async processing)
- **AI**: Cloudflare Workers AI
- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **Authentication**: JWT with refresh tokens
- **Email**: Resend API
- **Open Banking**: TrueLayer

##  Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd finhome
   npm install
   ```

2. **Set up local secrets:**
   ```bash
   cd apps/api
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your development credentials
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

### Production Deployment

**DO NOT deploy until you complete the security checklist!**

1. Read [SECURITY_PRODUCTION.md](./SECURITY_PRODUCTION.md)
2. Set all secrets via `wrangler secret put`
3. Configure GitHub repository secrets
4. Follow [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)

```bash
# Example: Setting secrets
cd apps/api
wrangler secret put JWT_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put TRUELAYER_CLIENT_ID
wrangler secret put TRUELAYER_CLIENT_SECRET
```

##  Test Credentials Warning

The repository contains test files with hardcoded development credentials:
- Email: `admin@finhome360.com`
- Password: `Admin123!@#`

**These are for DEVELOPMENT ONLY.** See [TEST_FILES_AUDIT.md](./TEST_FILES_AUDIT.md) for details.

If this account exists in production, **change the password immediately**.

##  Project Structure

```
finhome/
 apps/
    api/          # Cloudflare Workers API
    web/          # Next.js frontend
 packages/
    shared/       # Shared types and schemas
 Docs/            # Complete documentation
 .github/         # CI/CD workflows
 Security docs/   # Production security guides
```

##  Testing

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Build all packages
npm run build
```

##  Recent Changes

-  Removed all hardcoded secrets from codebase
-  Added comprehensive production security documentation
-  Implemented open banking integration (TrueLayer)
-  Added PDF bank statement parsing
-  Created deployment checklist and security review

##  Security Features

- JWT-based authentication with refresh tokens
- Password hashing (bcrypt)
- SQL injection prevention (parameterized queries via Drizzle ORM)
- XSS protection (React auto-escaping)
- CORS middleware
- Multi-tenant isolation
- Secret management via Cloudflare Workers secrets

##  Support

For production deployment issues:
- **Cloudflare**: [dash.cloudflare.com/support](https://dash.cloudflare.com/support)
- **TrueLayer**: [docs.truelayer.com](https://docs.truelayer.com)
- **Resend**: [resend.com/support](https://resend.com/support)

##  License

Proprietary - All rights reserved

---

**Last Updated**: November 2025
**Version**: 1.0.0 (Production Ready - Pending Secret Configuration)

# FamilyBudget Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloudflare Services

You'll need a Cloudflare account to set up the required services.

#### Create D1 Database
```bash
wrangler d1 create finhome-db
```

Copy the database ID and update `apps/api/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "finhome-db"
database_id = "your-database-id-here"
```

#### Create KV Namespaces
```bash
wrangler kv:namespace create "SESSIONS"
wrangler kv:namespace create "CACHE"
```

Update `apps/api/wrangler.toml` with the namespace IDs.

#### Create R2 Bucket
```bash
wrangler r2 bucket create finhome-files
```

#### Create Queue
```bash
wrangler queues create finhome-bill-reminders
```

### 3. Run Database Migrations

```bash
# Generate migrations (already created)
npm run db:generate --workspace=@finhome/api

# Apply migrations to D1
npm run db:migrate --workspace=@finhome/api
```

### 4. Set Up Environment Variables

#### API (Cloudflare Workers)

Copy `.env.example` and create `.dev.vars` in `apps/api/`:
```
JWT_SECRET=your-secret-key-here
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
```

#### Web (Next.js)

Copy `apps/web/.env.example` to `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### 5. Start Development Servers

Start everything:
```bash
npm run dev
```

Or start individually:

```bash
# Start API only (http://localhost:8787)
npm run dev --workspace=@finhome/api

# Start Web only (http://localhost:3000)
npm run dev --workspace=@finhome/web
```

## Testing

Run all tests:
```bash
npm run test
```

Run tests for specific package:
```bash
npm run test --workspace=@finhome/api
```

## Building

Build all packages:
```bash
npm run build
```

Build specific package:
```bash
npm run build --workspace=@finhome/web
npm run build --workspace=@finhome/api
```

## Linting

Lint all packages:
```bash
npm run lint
```

## Deployment

### Deploy API to Cloudflare Workers

```bash
npm run deploy --workspace=@finhome/api
```

### Deploy Web to Cloudflare Pages

1. Connect your repository to Cloudflare Pages
2. Configure build settings:
   - Build command: `npm run build --workspace=@finhome/web`
   - Build output directory: `apps/web/.next`
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: Your Workers API URL

Or use the GitHub Actions workflow which automatically deploys on push to main.

## Docker

### Run with Docker Compose

```bash
docker-compose up
```

### Build Production Image

```bash
docker build -t finhome .
docker run -p 3000:3000 finhome
```

## Cloudflare Account Setup

1. Sign up for a Cloudflare account at https://dash.cloudflare.com/sign-up
2. Install Wrangler CLI globally:
   ```bash
   npm install -g wrangler
   ```
3. Login to Cloudflare:
   ```bash
   wrangler login
   ```
4. Get your Account ID from the Cloudflare dashboard
5. Update `apps/api/wrangler.toml` with your account ID

## GitHub Secrets

For CI/CD to work, add these secrets to your GitHub repository:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers and Pages permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `NEXT_PUBLIC_API_URL`: Production API URL

## Troubleshooting

### TypeScript Errors

If you encounter TypeScript errors:
```bash
npm run lint
```

### Build Errors

Clean and reinstall:
```bash
npm run clean
npm install
npm run build
```

### Wrangler Issues

Make sure you're logged in:
```bash
wrangler whoami
```

If not logged in:
```bash
wrangler login
```

## Project Structure

```
finhome/
├── apps/
│   ├── api/                    # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── db/            # Database schema and migrations
│   │   │   │   ├── schema.ts  # Drizzle schema definitions
│   │   │   │   └── index.ts   # Database initialization
│   │   │   ├── middleware/    # Auth, CORS, etc.
│   │   │   ├── routes/        # API endpoints
│   │   │   │   ├── auth.ts    # Authentication endpoints
│   │   │   │   ├── transactions.ts  # Transaction CRUD
│   │   │   │   ├── budgets.ts       # Budget management
│   │   │   │   └── analytics.ts     # Analytics & reports
│   │   │   ├── utils/         # Utilities (CSV/OFX parsers)
│   │   │   ├── types.ts       # TypeScript types
│   │   │   └── index.ts       # Main entry point
│   │   ├── drizzle/
│   │   │   └── migrations/    # Database migrations
│   │   ├── wrangler.toml      # Cloudflare configuration
│   │   ├── drizzle.config.ts  # Drizzle configuration
│   │   └── package.json
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/           # Next.js App Router
│       │   │   ├── layout.tsx # Root layout
│       │   │   ├── page.tsx   # Home page
│       │   │   └── globals.css # Global styles
│       │   ├── components/    # React components
│       │   │   ├── Button.tsx
│       │   │   └── Card.tsx
│       │   └── lib/           # Utilities
│       │       └── api.ts     # API client
│       ├── public/            # Static assets
│       ├── next.config.js     # Next.js config
│       ├── tailwind.config.js # Tailwind config
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared code
│       └── src/
│           ├── schemas.ts     # Zod validation schemas
│           ├── types.ts       # Shared TypeScript types
│           └── index.ts       # Exports
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # GitHub Actions pipeline
│
├── docker-compose.yml          # Docker Compose config
├── Dockerfile                  # Docker image
├── package.json                # Root workspace config
├── turbo.json                  # Turbo configuration
└── README.md                   # Main documentation
```

## Database Schema

The application uses the following tables:

### tenants
- Multi-tenant organization/family groups
- Each tenant has isolated data

### users
- User accounts within tenants
- Roles: admin, member

### accounts
- Bank accounts (checking, savings, credit, etc.)
- Tracks balances per account

### categories
- Income and expense categories
- Supports hierarchical categories (parent/child)

### transactions
- Financial transactions (income, expense, transfer)
- Linked to accounts and categories

### budgets
- Budget allocations per category
- Supports weekly, monthly, yearly periods

### bill_reminders
- Automated bill reminders
- Configurable frequency and notification timing

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token

### Transactions
- `GET /api/transactions` - List all transactions
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Budgets
- `GET /api/budgets` - List all budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Analytics
- `GET /api/analytics/spending` - Get spending analytics
- `GET /api/analytics/cashflow` - Get cashflow data

All protected endpoints require Bearer token authentication.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

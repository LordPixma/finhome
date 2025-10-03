# Finhome360

A multi-tenant SaaS application for family budgeting built on the Cloudflare stack.

**Live at:** 
- 🌐 **Marketing Site**: https://finhome360.com (Cloudflare Pages)
- 📱 **Web App**: https://app.finhome360.com (Cloudflare Workers)

## 🚀 Features

- **Multi-tenant Architecture**: Secure tenant isolation with subdomain-based access
- **Bank Statement Import**: Upload and parse CSV/OFX files for automatic transaction import
- **Transaction Management**: Track income, expenses, and transfers across multiple accounts
- **Budget Tracking**: Set and monitor budgets by category with visual progress indicators
- **Analytics Dashboard**: Comprehensive spending analytics and cashflow visualization
- **Bill Reminders**: Automated reminders for upcoming bills using Cloudflare Queues
- **Real-time Updates**: Fast, responsive UI built with Next.js and React
- **Secure Authentication**: JWT-based authentication with session management

## 🏗️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type-safe development

### Backend
- **Cloudflare Workers**: Serverless compute platform
- **Hono**: Lightweight web framework for Workers
- **Drizzle ORM**: TypeScript ORM for database management
- **Cloudflare D1**: SQLite database at the edge
- **Cloudflare KV**: Key-value storage for sessions and cache
- **Cloudflare R2**: Object storage for file uploads
- **Cloudflare Queues**: Message queuing for bill reminders

### Validation & Testing
- **Zod**: TypeScript-first schema validation
- **Vitest**: Unit testing framework

### DevOps
- **Turbo**: Monorepo build system
- **Docker**: Containerization
- **GitHub Actions**: CI/CD pipeline
- **Wrangler**: Cloudflare deployment tool

## 📁 Project Structure

```
finhome/
├── apps/
│   ├── api/                # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── db/        # Database schema and migrations
│   │   │   ├── middleware/ # Auth, CORS, etc.
│   │   │   ├── routes/    # API endpoints
│   │   │   ├── services/  # Email service, etc.
│   │   │   └── index.ts   # Main entry point
│   │   ├── wrangler.toml  # Cloudflare configuration
│   │   └── package.json
│   │
│   ├── web/               # Next.js web application
│   │   ├── src/
│   │   │   ├── app/       # Next.js App Router
│   │   │   ├── components/ # React components
│   │   │   └── lib/       # Utilities
│   │   └── package.json
│   │
│   └── marketing/         # Marketing landing page
│       ├── src/
│       │   ├── app/       # Next.js App Router
│       │   └── components/ # React components
│       ├── out/           # Static export output
│       └── package.json
│
├── packages/
│   └── shared/            # Shared types and schemas
│       └── src/
│           ├── schemas.ts # Zod validation schemas
│           └── types.ts   # TypeScript types
│
├── .github/
│   └── workflows/         # CI/CD pipelines
│
├── docker-compose.yml     # Local development
├── Dockerfile            # Production build
└── package.json          # Root workspace config
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Cloudflare account (for deployment)
- Wrangler CLI installed globally: `npm install -g wrangler`

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LordPixma/finhome.git
   cd finhome
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Cloudflare Services**
   
   Create a D1 database:
   ```bash
   wrangler d1 create finhome-db
   ```
   
   Create KV namespaces:
   ```bash
   wrangler kv:namespace create "SESSIONS"
   wrangler kv:namespace create "CACHE"
   ```
   
   Create R2 bucket:
   ```bash
   wrangler r2 bucket create finhome-files
   ```
   
   Create Queue:
   ```bash
   wrangler queues create finhome-bill-reminders
   ```

4. **Update wrangler.toml**
   
   Update `apps/api/wrangler.toml` with your resource IDs from the previous step.

5. **Run database migrations**
   ```bash
   npm run db:generate --workspace=@finhome/api
   npm run db:migrate --workspace=@finhome/api
   ```

### Development

Start all services in development mode:

```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- API: http://localhost:8787

Or start individually:

```bash
# Start API only
npm run dev --workspace=@finhome/api

# Start web only
npm run dev --workspace=@finhome/web
```

### Building

Build all packages:

```bash
npm run build
```

### Testing

Run tests:

```bash
npm run test
```

### Linting

Lint all packages:

```bash
npm run lint
```

## 🐳 Docker

Run with Docker Compose:

```bash
docker-compose up
```

Build production image:

```bash
docker build -t finhome .
```

## 🚀 Deployment

### Cloudflare Workers (API)

```bash
npm run deploy --workspace=@finhome/api
```

### Cloudflare Pages (Web)

The web app can be deployed to Cloudflare Pages:

1. Connect your repository to Cloudflare Pages
2. Set build command: `npm run build --workspace=@finhome/web`
3. Set build output directory: `apps/web/.next`
4. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: Your Workers API URL

Or use the GitHub Actions workflow which automatically deploys on push to main.

## 🔐 Environment Variables

### API (Cloudflare Workers)

Set in `apps/api/wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"
JWT_SECRET = "your-secret-key"
FRONTEND_URL = "https://your-domain.com"
```

### Web (Next.js)

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-workers-api.workers.dev
```

## 📚 API Documentation

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

## 🗄️ Database Schema

The application uses the following main tables:

- `tenants` - Multi-tenant organizations
- `users` - User accounts
- `accounts` - Bank accounts
- `categories` - Transaction categories
- `transactions` - Financial transactions
- `budgets` - Budget allocations
- `bill_reminders` - Bill reminder settings

See `apps/api/src/db/schema.ts` for complete schema definitions.

## 🧪 Testing

The project includes:

- Unit tests for business logic
- Integration tests for API endpoints
- Component tests for React components

Run tests with:

```bash
npm run test
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

Project Link: [https://github.com/LordPixma/finhome](https://github.com/LordPixma/finhome)

## 🙏 Acknowledgments

- Cloudflare for the amazing serverless platform
- Next.js team for the excellent React framework
- Drizzle ORM for the TypeScript-first ORM
- All open-source contributors

# Production Secret Management Guide

This document explains how to properly configure sensitive environment variables for production deployment.

## Overview

Sensitive values like API keys, secrets, and tokens should **NEVER** be hardcoded in the codebase or committed to version control. Instead, they are managed using:

1. **Cloudflare Workers Secrets** - For production environment
2. **Local .dev.vars file** - For local development (git-ignored)
3. **GitHub Secrets** - For CI/CD pipeline credentials

## Required Secrets

### 1. JWT_SECRET
**Purpose:** Signs and verifies JWT tokens for authentication

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**How to set:**
```bash
cd apps/api
wrangler secret put JWT_SECRET
# Paste the generated secret when prompted
```

### 2. RESEND_API_KEY
**Purpose:** Sends transactional emails via Resend service

**How to get:**
1. Sign up at https://resend.com
2. Create an API key in the dashboard
3. Verify your domain

**How to set:**
```bash
cd apps/api
wrangler secret put RESEND_API_KEY
# Paste your Resend API key (starts with re_)
```

### 3. TRUELAYER_CLIENT_ID
**Purpose:** OAuth client ID for TrueLayer open banking integration

**How to get:**
1. Sign up at https://console.truelayer.com
2. Create a new application
3. Copy the Client ID

**How to set:**
```bash
cd apps/api
wrangler secret put TRUELAYER_CLIENT_ID
# Paste your TrueLayer client ID
```

### 4. TRUELAYER_CLIENT_SECRET
**Purpose:** OAuth client secret for TrueLayer authentication

**How to get:**
1. From TrueLayer console (same application as above)
2. Copy the Client Secret

**How to set:**
```bash
cd apps/api
wrangler secret put TRUELAYER_CLIENT_SECRET
# Paste your TrueLayer client secret
```

### 5. ADMIN_FIX_SECRET_KEY (Optional)
**Purpose:** Protects temporary admin database fix endpoint

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**How to set:**
```bash
cd apps/api
wrangler secret put ADMIN_FIX_SECRET_KEY
# Paste the generated secret
```

## GitHub Secrets (CI/CD)

Required GitHub repository secrets for automated deployments:

1. **CLOUDFLARE_API_TOKEN**
   - Get from: https://dash.cloudflare.com/profile/api-tokens
   - Permissions needed: Account - Cloudflare Pages:Edit, Workers Scripts:Edit, D1:Edit

2. **CLOUDFLARE_ACCOUNT_ID**
   - Get from: Cloudflare dashboard URL or Workers & Pages overview

3. **NEXT_PUBLIC_API_URL**
   - Value: `https://api.finhome360.com`

### How to add GitHub Secrets:
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with the corresponding value

## Local Development Setup

1. **Copy the example file:**
   ```bash
   cd apps/api
   cp .dev.vars.example .dev.vars
   ```

2. **Fill in your values:**
   Edit `.dev.vars` and add your development credentials

3. **Verify it's git-ignored:**
   The `.dev.vars` file is already listed in `.gitignore` and will never be committed

4. **Start development:**
   ```bash
   npm run dev
   ```

## Verifying Secret Configuration

### Check if secrets are set:
```bash
cd apps/api
wrangler secret list
```

### Test a specific secret (only shows if it exists, not the value):
```bash
wrangler secret list | grep JWT_SECRET
```

## Security Best Practices

1. ✅ **DO:**
   - Use strong, randomly generated secrets (min 32 characters)
   - Rotate secrets periodically
   - Use different secrets for dev/staging/production
   - Keep .dev.vars in .gitignore
   - Use wrangler secret put for production

2. ❌ **DON'T:**
   - Hardcode secrets in source code
   - Commit secrets to version control
   - Share secrets via email or chat
   - Use the same secrets across environments
   - Log secret values in application code

## Troubleshooting

### "JWT_SECRET is undefined" error
```bash
# Make sure secret is set
cd apps/api
wrangler secret put JWT_SECRET
```

### "Invalid Resend API key" error
```bash
# Verify your API key at https://resend.com/api-keys
# Make sure it starts with "re_"
wrangler secret put RESEND_API_KEY
```

### Local development not picking up secrets
```bash
# Make sure .dev.vars exists and is in apps/api directory
cd apps/api
ls -la .dev.vars
```

## Migration from Old Setup

If you're migrating from the old hardcoded setup:

1. **Generate new secrets** (don't reuse the old ones from git history)
2. **Set them via wrangler secret put**
3. **Update .dev.vars for local development**
4. **Deploy the updated code**
5. **Verify everything works**
6. **Delete old secret values from git history** (optional but recommended)

## Support

For issues with:
- **Cloudflare Workers Secrets:** Check Cloudflare documentation
- **GitHub Secrets:** Verify repository permissions
- **TrueLayer credentials:** Contact TrueLayer support
- **Resend API:** Check Resend dashboard and docs

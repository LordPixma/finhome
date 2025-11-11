# Security & Production Deployment

## ⚠️ CRITICAL: Before Production Deployment

This document must be read before deploying Finhome360 to production.

### 1. Remove Hardcoded Secrets

The codebase has been updated to remove hardcoded secrets from:
- ✅ `apps/api/wrangler.toml` - Secrets removed, instructions added
- ✅ `apps/api/src/index.ts` - Admin fix secret moved to environment variable
- ✅ Test files documented in `TEST_FILES_AUDIT.md`

### 2. Set Production Secrets

**Required secrets must be set using Cloudflare Workers secrets:**

```bash
cd apps/api

# Generate and set JWT secret (64 char hex recommended)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
wrangler secret put JWT_SECRET

# Set Resend API key (from https://resend.com)
wrangler secret put RESEND_API_KEY

# Set TrueLayer credentials (from https://console.truelayer.com)
# Note: TRUELAYER_CLIENT_ID is set in wrangler.toml [vars] section (it's public)
wrangler secret put TRUELAYER_CLIENT_SECRET

# Set admin fix secret (optional, for temporary admin endpoint)
wrangler secret put ADMIN_FIX_SECRET_KEY
```

**See [PRODUCTION_SECRETS_SETUP.md](./PRODUCTION_SECRETS_SETUP.md) for detailed instructions.**

### 3. GitHub Secrets

Required for CI/CD:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_API_URL`

Add these in: Repository Settings → Secrets and variables → Actions

### 4. Test Credentials Cleanup

**Action Required:**
- Test files contain: `admin@finhome360.com` / `Admin123!@#`
- If this account exists in production, **change the password immediately**
- Create production admin with a strong password
- See `TEST_FILES_AUDIT.md` for full list

### 5. Local Development

```bash
cd apps/api
cp .dev.vars.example .dev.vars
# Fill in your development credentials
```

The `.dev.vars` file is git-ignored and safe for local secrets.

### 6. Verify Secret Configuration

```bash
cd apps/api
wrangler secret list
```

You should see:
- JWT_SECRET
- RESEND_API_KEY
- TRUELAYER_CLIENT_SECRET
- ADMIN_FIX_SECRET_KEY (if set)

Note: `TRUELAYER_CLIENT_ID` is in `wrangler.toml` as a public environment variable, not a secret.

### 7. Security Checklist

Before going live:

- [ ] All secrets set via `wrangler secret put`
- [ ] No secrets in wrangler.toml
- [ ] No secrets in source code
- [ ] .dev.vars in .gitignore
- [ ] GitHub secrets configured
- [ ] Test accounts removed/secured in production
- [ ] Strong admin password set
- [ ] HTTPS enforced (automatic with Cloudflare)
- [ ] CORS properly configured
- [ ] Rate limiting considered (future enhancement)

## What Changed?

### Before (Insecure):
```toml
# apps/api/wrangler.toml
[vars]
JWT_SECRET = "gBk9Lm3Np2Qr5Ts8Wv1Yx4Za7Cd0Ef3Hi6Jl9Mo2Pr5Su8Vx1Za4Cd7Ff0Hi3" ❌
RESEND_API_KEY = "re_joNCiaUb_4q5et1qJxxfpNbXPhUbq2pFL" ❌
TRUELAYER_CLIENT_ID = "finhome360-366caa" ❌
TRUELAYER_CLIENT_SECRET = "387d8151-cb75-481d-8dc3-bab84ba4fd36" ❌
```

### After (Secure):
```toml
# apps/api/wrangler.toml
[vars]
ENVIRONMENT = "production"
FRONTEND_URL = "https://app.finhome360.com"
TRUELAYER_REDIRECT_URI = "https://api.finhome360.com/api/banking/callback"
TRUELAYER_CLIENT_ID = "finhome360-366caa"  # Public OAuth client ID ✅

# Secrets set via: wrangler secret put <SECRET_NAME> ✅
```

## Support

For issues:
- **Cloudflare Workers**: Check wrangler documentation
- **Secrets not working**: Verify with `wrangler secret list`
- **Local dev issues**: Check `.dev.vars` exists and has correct values
- **TrueLayer**: Verify redirect URI matches in TrueLayer console

## Additional Resources

- [PRODUCTION_SECRETS_SETUP.md](./PRODUCTION_SECRETS_SETUP.md) - Detailed setup guide
- [TEST_FILES_AUDIT.md](./TEST_FILES_AUDIT.md) - Test credential warnings
- [Cloudflare Workers Secrets Docs](https://developers.cloudflare.com/workers/configuration/secrets/)

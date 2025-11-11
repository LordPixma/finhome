# Production Deployment Checklist

Complete this checklist before deploying Finhome360 to production.

## ☑️ Pre-Deployment Checklist

### 1. Security & Secrets ⚠️ CRITICAL
- [ ] Read [SECURITY_PRODUCTION.md](./SECURITY_PRODUCTION.md)
- [ ] Read [PRODUCTION_SECRETS_SETUP.md](./PRODUCTION_SECRETS_SETUP.md)
- [ ] All secrets removed from source code (verified)
- [ ] Secrets set via `wrangler secret put`:
  - [ ] JWT_SECRET (64+ char hex)
  - [ ] RESEND_API_KEY (from Resend dashboard)
  - [ ] TRUELAYER_CLIENT_ID (from TrueLayer console)
  - [ ] TRUELAYER_CLIENT_SECRET (from TrueLayer console)
  - [ ] ADMIN_FIX_SECRET_KEY (optional, for admin endpoint)
- [ ] Verify secrets: `wrangler secret list`
- [ ] Test credentials reviewed (see TEST_FILES_AUDIT.md)
- [ ] Default admin password changed in production

### 2. GitHub Repository Secrets
- [ ] CLOUDFLARE_API_TOKEN set (with correct permissions)
- [ ] CLOUDFLARE_ACCOUNT_ID set
- [ ] NEXT_PUBLIC_API_URL set (https://api.finhome360.com)
- [ ] Verify in: Settings → Secrets and variables → Actions

### 3. Cloudflare Configuration
- [ ] D1 Database created: `finhome-db`
- [ ] KV Namespaces created:
  - [ ] SESSIONS
  - [ ] CACHE
- [ ] R2 Bucket created: `finhome-files`
- [ ] Queue created: `finhome-bill-reminders`
- [ ] Custom domain configured: `api.finhome360.com`
- [ ] SSL/TLS encryption mode: Full (strict)

### 4. External Services
- [ ] Resend account created and verified
- [ ] Domain verified in Resend for email sending
- [ ] TrueLayer application created (sandbox or production)
- [ ] TrueLayer redirect URI registered: `https://api.finhome360.com/api/banking/callback`
- [ ] TrueLayer credentials obtained (client ID & secret)

### 5. Database
- [ ] Migrations applied: `wrangler d1 migrations apply finhome-db --remote`
- [ ] Banking tables verified (bank_connections, bank_accounts, transaction_sync_history)
- [ ] Core tables verified (tenants, users, transactions, etc.)
- [ ] Indexes created (check DATABASE_INDEXES_COMPLETE.md)

### 6. Code Quality
- [ ] All tests passing: `npm test`
- [ ] Lint checks passing: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors
- [ ] No console.log statements with sensitive data

### 7. Environment Variables
Non-sensitive vars in wrangler.toml:
- [ ] ENVIRONMENT = "production"
- [ ] FRONTEND_URL = "https://app.finhome360.com"
- [ ] TRUELAYER_REDIRECT_URI = "https://api.finhome360.com/api/banking/callback"

### 8. Web Application (Next.js)
- [ ] Build succeeds: `npm run build --workspace=@finhome360/web`
- [ ] Environment variable set: NEXT_PUBLIC_API_URL
- [ ] Cloudflare Pages project created: `finhome-web`
- [ ] Custom domain configured: `app.finhome360.com`
- [ ] SSL certificate active

### 9. DNS Configuration
- [ ] A/CNAME record for api.finhome360.com → Cloudflare Workers
- [ ] A/CNAME record for app.finhome360.com → Cloudflare Pages
- [ ] Wildcard DNS for tenant subdomains (*.finhome360.com)
- [ ] SSL certificates valid

### 10. CI/CD Pipeline
- [ ] GitHub Actions workflow tested
- [ ] Deployment to Cloudflare Workers succeeds
- [ ] Deployment to Cloudflare Pages succeeds
- [ ] Migration verification step passes

### 11. Monitoring & Logging
- [ ] Cloudflare Workers analytics enabled
- [ ] Error tracking configured (optional: Sentry)
- [ ] Performance monitoring enabled
- [ ] Log retention policy understood

### 12. Post-Deployment Verification
- [ ] Health check endpoint responds: `https://api.finhome360.com/`
- [ ] Web app loads: `https://app.finhome360.com`
- [ ] User registration works
- [ ] User login works
- [ ] JWT tokens issued correctly
- [ ] Email notifications send
- [ ] Bank connection flow works (TrueLayer OAuth)
- [ ] Transaction sync functions
- [ ] File uploads work (R2)
- [ ] AI categorization runs
- [ ] Bill reminder queue processes

### 13. Security Hardening
- [ ] CORS configured correctly (only allow app.finhome360.com)
- [ ] Rate limiting considered (future enhancement)
- [ ] SQL injection prevention (using Drizzle ORM parameterized queries)
- [ ] XSS prevention (React auto-escaping, Content-Security-Policy headers)
- [ ] CSRF protection (SameSite cookies, token validation)
- [ ] No sensitive data in logs
- [ ] No debug endpoints in production
- [ ] Admin endpoints properly secured

### 14. Documentation
- [ ] README updated with production info
- [ ] API documentation available
- [ ] User guide created (optional)
- [ ] Admin guide created
- [ ] Troubleshooting guide available

### 15. Backup & Recovery
- [ ] D1 database backup strategy understood
- [ ] R2 bucket versioning enabled (if needed)
- [ ] Recovery procedure documented
- [ ] Rollback plan prepared

### 16. Compliance & Legal
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance reviewed (if applicable)
- [ ] Data retention policy defined
- [ ] Cookie consent implemented (if needed)

### 17. Performance
- [ ] Database indexes optimized
- [ ] Caching strategy implemented (KV)
- [ ] CDN configured (Cloudflare automatic)
- [ ] Asset optimization (Next.js automatic)
- [ ] API response times acceptable

### 18. Final Checks
- [ ] All team members trained
- [ ] Support procedures in place
- [ ] Incident response plan ready
- [ ] Monitoring alerts configured
- [ ] On-call schedule defined (if needed)

## 🚀 Deployment Steps

### Step 1: Set Secrets
```bash
cd apps/api

# Generate and set each secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
wrangler secret put JWT_SECRET

wrangler secret put RESEND_API_KEY
wrangler secret put TRUELAYER_CLIENT_ID
wrangler secret put TRUELAYER_CLIENT_SECRET
wrangler secret put ADMIN_FIX_SECRET_KEY

# Verify
wrangler secret list
```

### Step 2: Deploy Database
```bash
cd apps/api
wrangler d1 migrations apply finhome-db --remote
```

### Step 3: Deploy API
```bash
npm run deploy --workspace=@finhome360/api
```

### Step 4: Deploy Web App
```bash
npm run build --workspace=@finhome360/web
# Then deploy via Cloudflare Pages dashboard or:
npx wrangler pages deploy apps/web/out --project-name=finhome-web
```

### Step 5: Verify Deployment
```bash
# Test health endpoint
curl https://api.finhome360.com/

# Test web app
open https://app.finhome360.com
```

## 🆘 Rollback Procedure

If something goes wrong:

1. **Revert Workers deployment:**
   ```bash
   wrangler rollback
   ```

2. **Revert database migrations:**
   ```bash
   # Restore from backup or manually revert schema changes
   ```

3. **Revert Pages deployment:**
   ```bash
   # Use Cloudflare dashboard to rollback to previous deployment
   ```

## 📞 Support Contacts

- **Cloudflare Support:** [dash.cloudflare.com/support](https://dash.cloudflare.com/support)
- **TrueLayer Support:** [docs.truelayer.com](https://docs.truelayer.com)
- **Resend Support:** [resend.com/support](https://resend.com/support)

## ✅ Post-Deployment

After successful deployment:

- [ ] Monitor error rates for 24 hours
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] Test with real users
- [ ] Document any issues
- [ ] Update runbook with lessons learned

---

**Last Updated:** {DATE}
**Reviewed By:** {NAME}
**Deployment Date:** {DATE}

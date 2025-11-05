# Database Reset Guide for BETA Release

## Overview
This guide provides instructions for safely wiping all user data from the Finhome production database in preparation for the BETA release.

## ⚠️ CRITICAL WARNINGS

1. **IRREVERSIBLE**: This operation cannot be undone
2. **PRODUCTION DATA**: All user data will be permanently deleted
3. **BETA PREPARATION**: Only run this before launching BETA to real users
4. **BACKUPS**: Consider exporting data first if any test data is valuable

## What Gets Deleted

All user-generated content:
- ✅ Tenants (organizations)
- ✅ Users and authentication data
- ✅ Accounts (checking, savings, etc.)
- ✅ Transactions (all financial records)
- ✅ Categories (custom and default)
- ✅ Budgets
- ✅ Bill Reminders
- ✅ Recurring Transactions
- ✅ Goals and Goal Contributions
- ✅ User Settings
- ✅ Tenant Members (multi-user access)

## What Remains Intact

- ✅ Database schema (all tables and indexes)
- ✅ Cloudflare Workers bindings (D1, KV, R2, Queues, AI)
- ✅ Application code and configuration
- ✅ Custom domain settings
- ✅ Environment variables and secrets

## Execution Methods

### Method 1: PowerShell Script (Recommended)

**Dry Run (Safe - No Changes)**:
```powershell
cd apps/api
.\wipe-database.ps1 -DryRun
```

**Actual Wipe (Requires Confirmation)**:
```powershell
cd apps/api
.\wipe-database.ps1
# Type "WIPE DATABASE" when prompted
```

**Force Mode (No Confirmation - Dangerous)**:
```powershell
.\wipe-database.ps1 -Force
```

### Method 2: Direct SQL Execution

```powershell
cd apps/api
wrangler d1 execute finhome-db --file=wipe-database.sql --remote
```

### Method 3: Manual via Wrangler CLI

```powershell
# Execute each DELETE statement manually
wrangler d1 execute finhome-db --command="DELETE FROM goal_contributions" --remote
wrangler d1 execute finhome-db --command="DELETE FROM user_settings" --remote
# ... (continue for all tables in order)
```

## Post-Wipe Checklist

### 1. Verify Empty Database

```powershell
# Check key tables
wrangler d1 execute finhome-db --command="SELECT COUNT(*) FROM tenants" --remote
wrangler d1 execute finhome-db --command="SELECT COUNT(*) FROM users" --remote
wrangler d1 execute finhome-db --command="SELECT COUNT(*) FROM transactions" --remote
```

Expected output: All counts should be `0`

### 2. Clear KV Stores (Optional but Recommended)

**CACHE KV Namespace**:
```powershell
# List keys
wrangler kv:key list --namespace-id=ec9376073fb34ebd9f1dcabbc3cc39ae

# Delete all keys (if needed)
# You can manually delete via dashboard or script iteration
```

**SESSIONS KV Namespace**:
```powershell
# List keys
wrangler kv:key list --namespace-id=17af1f0cba5940188630322248a86071

# Delete all keys (if needed)
```

### 3. Test Registration Flow

1. Visit: https://44038a26.finhome-web.pages.dev/register
2. Create a new tenant account
3. Verify:
   - Registration succeeds
   - JWT token is issued
   - Redirect to dashboard works
   - Subdomain routing works (if applicable)

### 4. Smoke Test Core Features

Create test data and verify:
- ✅ Create accounts
- ✅ Add categories
- ✅ Create transactions
- ✅ Set up budgets
- ✅ Add bill reminders
- ✅ Test AI categorization
- ✅ View analytics
- ✅ Invite family member

## Rollback Strategy

**There is NO rollback for this operation.**

If you need to preserve data:
1. Export data before wiping (via API or D1 export)
2. Store export in secure location
3. Re-import after wipe if needed

## Production Deployment Timeline

### Before BETA Launch:
1. ✅ Wipe database (this script)
2. ✅ Clear KV caches
3. ✅ Update any hardcoded test credentials
4. ✅ Verify all secrets are in place (JWT_SECRET, RESEND_API_KEY)
5. ✅ Run smoke tests
6. ✅ Update marketing site with BETA signup

### During BETA:
- Monitor for errors (wrangler tail --name finhome)
- Track registration volume
- Collect user feedback
- Monitor D1 database size/limits

### Post-BETA:
- Migrate to production domain (if using beta subdomain)
- Set up proper backups
- Implement data retention policies
- Add admin tools for data management

## Troubleshooting

### Error: "script still in use as a consumer for a queue"
This relates to Workers, not database. The database wipe script only affects D1 data, not queue consumers.

### Error: "foreign key constraint failed"
The script disables foreign keys temporarily. If this error occurs, ensure you're running the full SQL script, not individual statements.

### Some tables still have data
Re-run the wipe script. Check for:
- Active connections holding locks
- D1 replication lag
- Execute verification queries again after 30 seconds

## Database Statistics (Current as of Wipe)

Run this to capture current state before wiping:

```sql
SELECT 
  (SELECT COUNT(*) FROM tenants) as tenants,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM accounts) as accounts,
  (SELECT COUNT(*) FROM categories) as categories,
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT COUNT(*) FROM budgets) as budgets,
  (SELECT COUNT(*) FROM bill_reminders) as bill_reminders,
  (SELECT COUNT(*) FROM recurring_transactions) as recurring,
  (SELECT COUNT(*) FROM goals) as goals,
  (SELECT COUNT(*) FROM goal_contributions) as contributions,
  (SELECT COUNT(*) FROM user_settings) as settings,
  (SELECT COUNT(*) FROM tenant_members) as members;
```

## Support

If you encounter issues:
1. Check wrangler logs: `~/.wrangler/logs/`
2. Review D1 dashboard for errors
3. Verify wrangler version: `wrangler --version`
4. Ensure authenticated: `wrangler whoami`

---

**Last Updated**: 2025-10-07  
**Script Version**: 1.0.0  
**Database**: finhome-db (1115b8c7-85fd-4ce8-a553-8fe85fb5b629)

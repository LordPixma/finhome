# Deprecations

## Bank Connections & Automatic Transaction Sync (Open Banking)

- Status: Removed in Bankless Edition (Nov 2025)
- Affected components: API banking routes/services, transaction sync services, UI banking page, related Cloudflare bindings (queues/cron), and schema tables listed below
- Replacement: Manual entry and file uploads (CSV/OFX/QIF) with AI categorization

### Database tables removed

These tables are dropped by migration 0005_drop_open_banking.sql:

- bank_connections
- bank_accounts
- transaction_sync_history

For legacy reference, see:
- Docs/TRUELAYER_PRODUCTION_MIGRATION.md (DEPRECATED)
- Docs/AUTOMATIC_TRANSACTION_SYNC_VERIFICATION.md (DEPRECATED)

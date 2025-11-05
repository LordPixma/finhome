# CI/CD Migrations for D1

This project applies Cloudflare D1 migrations in CI before deploying the API.

## Where it runs

- GitHub Actions workflow: `.github/workflows/ci-cd.yml`
- Job (standalone): `db-migrations-verify` — applies migrations and verifies schema
- Job (deploy): `deploy-api` — also applies migrations just-in-time as a safeguard

```yaml
db-migrations-verify:
  runs-on: ubuntu-latest
  needs: lint-and-test
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - name: Apply D1 migrations (remote)
      run: |
        yes | npx wrangler d1 migrations apply finhome-db --config apps/api/wrangler.toml --remote
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    - name: Verify D1 schema (banking tables absent)
      run: |
        set -e
        npx wrangler d1 execute finhome-db --config apps/api/wrangler.toml --remote \
          --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('bank_connections','bank_accounts','transaction_sync_history');" | tee /tmp/d1_absent.txt
        if grep -E 'bank_connections|bank_accounts|transaction_sync_history' /tmp/d1_absent.txt; then
          echo "Unexpected banking tables found after migrations" >&2
          exit 1
        fi
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    - name: Verify D1 schema (core table present)
      run: |
        set -e
        npx wrangler d1 execute finhome-db --config apps/api/wrangler.toml --remote \
          --command "SELECT name FROM sqlite_master WHERE type='table' AND name='tenants';" | tee /tmp/d1_tenants.txt
        grep -q 'tenants' /tmp/d1_tenants.txt
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

## Manual runs

Local:

```bash
wrangler d1 migrations apply finhome-db --config apps/api/wrangler.toml
```

Remote (production):

```bash
yes | wrangler d1 migrations apply finhome-db --config apps/api/wrangler.toml --remote
```

## Notes

- The migrations directory is configured in `apps/api/wrangler.toml` as `drizzle/migrations`.
- Bankless Edition drops the Open Banking tables via `0005_drop_open_banking.sql`.
- Ensure Cloudflare credentials are available in CI (API token and Account ID secrets).

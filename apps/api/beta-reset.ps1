# ========================================
# FINHOME BETA RESET UTILITY
# Purpose: Wipe tenant/user data for beta launch while preserving global admin
# Files used: beta-reset.sql, reset-admin-password.sql
# Requires: Cloudflare Wrangler CLI authenticated & production D1/KV access
# ========================================
param(
    [switch]$DryRun,                # Show counts only
    [switch]$Force,                 # Skip interactive confirmation
    [switch]$SkipPasswordReset,     # Do not run reset-admin-password.sql
    [switch]$SkipKV,                # Skip KV purge
    [switch]$SkipVerification,      # Skip post-wipe count verification
    [switch]$VerboseMode            # Extra logging
)

$ErrorActionPreference = 'Stop'

# Ensure we run from the script directory so relative SQL paths resolve
try {
    Set-Location -Path $PSScriptRoot
} catch {}

# Detect Wrangler CLI or fallback to `npx wrangler`
$script:UseNpx = $false
if (-not (Get-Command wrangler -ErrorAction SilentlyContinue)) {
    if (Get-Command npx -ErrorAction SilentlyContinue) {
        $script:UseNpx = $true
        Write-Host "Wrangler not found. Using 'npx wrangler' fallback." -ForegroundColor Yellow
    } else {
        Write-Host "Wrangler CLI is not installed and 'npx' is unavailable." -ForegroundColor Red
        Write-Host "Install Wrangler globally: npm i -g wrangler" -ForegroundColor Red
        Write-Host "Or run via NPX: npx wrangler <command>" -ForegroundColor Red
        exit 1
    }
}

function Invoke-Wrangler {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )
    if ($script:UseNpx) {
        $fullArgs = @('wrangler') + $Arguments
        return & npx @fullArgs
    } else {
        return & wrangler @Arguments
    }
}

# Config (match wrangler.toml)
$dbName = 'finhome-db'
$kvSessions = '17af1f0cba5940188630322248a86071'
$kvCache    = 'ec9376073fb34ebd9f1dcabbc3cc39ae'

Write-Host '========================================' -ForegroundColor Yellow
Write-Host 'FINHOME BETA RESET UTILITY' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Yellow
Write-Host ''

if ($DryRun) {
    Write-Host 'DRY RUN: Displaying current table counts (no modifications).' -ForegroundColor Yellow
}

# Tables to inspect (minimal + extended sets)
$coreTables = @(
    'tenants','users','global_users','accounts','categories','transactions'
)
$extendedTables = @(
    'budgets','bill_reminders','recurring_transactions','goals','goal_contributions',
    'user_settings','tenant_members','tenant_users','user_sessions','bank_connections','bank_accounts',
    'transaction_sync_history','import_logs','data_export_requests','global_admin_actions','security_incidents',
    'tenant_features','tenant_billing','tenant_analytics','system_metrics','global_admin_mfa','admin_sessions'
)

function Show-Counts($tables,[string]$Label) {
    Write-Host "-- $Label --" -ForegroundColor Magenta
    foreach ($t in $tables) {
        $resultJson = Invoke-Wrangler d1 execute $dbName "--command=SELECT COUNT(*) AS c FROM $t" --remote 2>$null
        try {
            $parsed = $resultJson | ConvertFrom-Json
            $count = $parsed.results[0].c
            Write-Host ("{0,-28} : {1}" -f $t,$count)
        } catch {
            Write-Host ("{0,-28} : ERROR" -f $t) -ForegroundColor Red
            if ($VerboseMode) { Write-Host $resultJson }
        }
    }
    Write-Host ''
}

Show-Counts -tables $coreTables -Label 'Core'
if ($VerboseMode -or $DryRun) { Show-Counts -tables $extendedTables -Label 'Extended' }

if ($DryRun) {
    Write-Host 'Dry run complete. Re-run without -DryRun to perform reset.' -ForegroundColor Green
    exit 0
}

if (-not $Force) {
    Write-Host 'WARNING: This will DELETE all tenant/user financial data and keep only the global admin & config.' -ForegroundColor Red
    $confirm = Read-Host "Type EXACTLY: BETA RESET CONFIRM"
    if ($confirm -ne 'BETA RESET CONFIRM') {
        Write-Host 'Cancelled. No changes applied.' -ForegroundColor Green
        exit 0
    }
}

Write-Host ''
Write-Host 'Executing beta-reset.sql ...' -ForegroundColor Yellow
Invoke-Wrangler d1 execute $dbName --file=beta-reset.sql --remote

if (-not $SkipPasswordReset) {
    Write-Host 'Resetting admin password (reset-admin-password.sql) ...' -ForegroundColor Yellow
    Invoke-Wrangler d1 execute $dbName --file=reset-admin-password.sql --remote
} else {
    Write-Host 'Skipping password reset as requested.' -ForegroundColor DarkYellow
}

if (-not $SkipKV) {
    Write-Host 'Purging KV namespaces (SESSIONS & CACHE) ...' -ForegroundColor Yellow
    foreach ($ns in @($kvSessions,$kvCache)) {
        Write-Host "Listing keys for namespace $ns" -ForegroundColor Cyan
        $keysJson = Invoke-Wrangler kv:key list --namespace-id $ns 2>$null
        try {
            $keys = $keysJson | ConvertFrom-Json
            $total = $keys.Count
            Write-Host "  Found $total keys" -ForegroundColor Gray
            $i = 0
            foreach ($k in $keys) {
                Invoke-Wrangler kv:key delete --namespace-id $ns $k.name 2>$null
                $i++
                if ($i % 25 -eq 0) { Write-Host "  Deleted $i/$total" -ForegroundColor DarkGray }
            }
            Write-Host "  Namespace $ns purge complete." -ForegroundColor Green
        } catch {
            Write-Host "  Failed parsing key list for $ns" -ForegroundColor Red
            if ($VerboseMode) { Write-Host $keysJson }
        }
    }
} else {
    Write-Host 'Skipping KV purge as requested.' -ForegroundColor DarkYellow
}

if (-not $SkipVerification) {
    Write-Host ''
    Write-Host 'Verifying post-reset state ...' -ForegroundColor Yellow
    Show-Counts -tables $coreTables -Label 'Core (Post-Reset)'

    Write-Host 'Checking global admin presence...' -ForegroundColor Cyan
    $adminJson = Invoke-Wrangler d1 execute $dbName "--command=SELECT id,email,is_global_admin,tenant_id FROM users WHERE email='admin@finhome360.com'" --remote 2>$null
    try {
        $adminParsed = $adminJson | ConvertFrom-Json
        if ($adminParsed.results.Count -eq 1 -and $adminParsed.results[0].is_global_admin -eq 1) {
            Write-Host 'Global admin row OK.' -ForegroundColor Green
        } else {
            Write-Host 'Global admin row MISSING or incorrect!' -ForegroundColor Red
            if ($VerboseMode) { Write-Host $adminJson }
        }
    } catch {
        Write-Host 'Failed to parse admin verification output.' -ForegroundColor Red
        if ($VerboseMode) { Write-Host $adminJson }
    }
}

Write-Host ''
Write-Host 'Beta reset complete.' -ForegroundColor Green
Write-Host 'Next steps:' -ForegroundColor Cyan
Write-Host '  1. Register a new user to create first beta tenant.'
Write-Host '  2. Login as global admin to confirm elevated access.'
Write-Host '  3. Create sample accounts & transactions for smoke tests.'
Write-Host '  4. Run AI report endpoint (should be empty/safe).' 
Write-Host ''

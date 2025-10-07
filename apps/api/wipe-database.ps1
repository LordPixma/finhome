# ========================================
# FINHOME DATABASE WIPE SCRIPT
# Purpose: Safely wipe all data for BETA release
# ========================================

param(
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "WARNING: FINHOME DATABASE WIPE UTILITY" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Get database info
$dbName = "finhome-db"
$dbId = "1115b8c7-85fd-4ce8-a553-8fe85fb5b629"

Write-Host "Target Database: $dbName" -ForegroundColor Cyan
Write-Host "Database ID: $dbId" -ForegroundColor Cyan
Write-Host ""

if (-not $Force) {
    Write-Host "WARNING: THIS WILL DELETE ALL USER DATA FROM PRODUCTION!" -ForegroundColor Red
    Write-Host ""
    Write-Host "This includes:" -ForegroundColor Yellow
    Write-Host "  - All tenants and users"
    Write-Host "  - All accounts and transactions"
    Write-Host "  - All budgets and goals"
    Write-Host "  - All categories and bill reminders"
    Write-Host "  - All settings and members"
    Write-Host ""
    
    $confirmation = Read-Host "Type 'WIPE DATABASE' to confirm (case-sensitive)"
    
    if ($confirmation -ne "WIPE DATABASE") {
        Write-Host "Cancelled. Database wipe aborted." -ForegroundColor Green
        exit 0
    }
}

Write-Host ""
Write-Host "Proceeding with database wipe..." -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No actual changes will be made" -ForegroundColor Cyan
    Write-Host ""
    
    # Show what would be deleted
    Write-Host "Checking current record counts..." -ForegroundColor Cyan
    
    $tables = @(
        "tenants",
        "users", 
        "accounts",
        "categories",
        "transactions",
        "budgets",
        "bill_reminders",
        "recurring_transactions",
        "goals",
        "goal_contributions",
        "user_settings",
        "tenant_members"
    )
    
    foreach ($table in $tables) {
        $query = "SELECT COUNT(*) as count FROM $table"
        Write-Host "  Querying $table..." -ForegroundColor Gray
        wrangler d1 execute $dbName --command="$query" --remote
    }
    
    Write-Host ""
    Write-Host "Dry run complete. Run without -DryRun to execute wipe." -ForegroundColor Green
    exit 0
}

# Execute the wipe
Write-Host "Executing database wipe..." -ForegroundColor Red
Write-Host ""

try {
    # Execute the SQL file
    Set-Location $PSScriptRoot
    wrangler d1 execute $dbName --file=wipe-database.sql --remote
    
    Write-Host ""
    Write-Host "Database wipe completed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Verify empty tables
    Write-Host "Verifying all tables are empty..." -ForegroundColor Cyan
    Write-Host ""
    
    $tables = @(
        "tenants",
        "users",
        "accounts",
        "transactions"
    )
    
    $allEmpty = $true
    foreach ($table in $tables) {
        $result = wrangler d1 execute $dbName --command="SELECT COUNT(*) as count FROM $table" --remote | ConvertFrom-Json
        $count = $result.results[0].count
        
        if ($count -eq 0) {
            Write-Host "  OK $table : 0 records" -ForegroundColor Green
        } else {
            Write-Host "  ERROR $table : $count records (expected 0)" -ForegroundColor Red
            $allEmpty = $false
        }
    }
    
    Write-Host ""
    
    if ($allEmpty) {
        Write-Host "Verification successful - all tables are empty!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Some tables still contain data. Please review." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "1. Clear KV stores (CACHE, SESSIONS):"
    Write-Host "   wrangler kv:key list --namespace-id=ec9376073fb34ebd9f1dcabbc3cc39ae"
    Write-Host "   wrangler kv:key list --namespace-id=17af1f0cba5940188630322248a86071"
    Write-Host ""
    Write-Host "2. Test registration with a new account"
    Write-Host "   Visit: https://44038a26.finhome-web.pages.dev/register"
    Write-Host ""
    Write-Host "3. Verify clean state"
    Write-Host "   - Register new tenant"
    Write-Host "   - Create test accounts"
    Write-Host "   - Add sample transactions"
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "Error during database wipe:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check logs and retry if needed." -ForegroundColor Yellow
    exit 1
}

-- Migration: Add performance indexes for frequently queried composite keys
-- Created: 2025-11-22
-- Purpose: Optimize query performance for transactions and bank connections

-- Add composite index for tenant + account queries on transactions table
-- This improves performance when filtering transactions by tenant and account
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_account ON transactions(tenant_id, account_id);

-- Add composite index for tenant + status queries on bank_connections table
-- This improves performance when checking active connections per tenant
CREATE INDEX IF NOT EXISTS idx_bank_connections_tenant_status ON bank_connections(tenant_id, status);

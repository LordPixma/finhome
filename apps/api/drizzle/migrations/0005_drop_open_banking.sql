-- 0005_drop_open_banking.sql
-- Bankless Edition: remove Open Banking tables
-- Order matters due to FKs: drop history -> accounts -> connections

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS transaction_sync_history;
DROP TABLE IF EXISTS bank_accounts;
DROP TABLE IF EXISTS bank_connections;

PRAGMA foreign_keys = ON;

-- Migration 0004 is now a no-op.
-- Rationale: The user profile columns are included in 0001_initial.sql for
-- fresh databases. Existing databases already have these columns applied,
-- and running ALTER statements would cause duplicate column errors.
-- Keeping this migration as a placeholder preserves sequence integrity.

-- NO-OP
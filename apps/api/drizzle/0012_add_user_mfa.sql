-- Migration: Add MFA support for all users
-- Created: 2025-11-22
-- Purpose: Enable optional MFA (Multi-Factor Authentication) for all tenant users

-- Create user_mfa table for regular users
CREATE TABLE IF NOT EXISTS user_mfa (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  secret TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 0,
  backup_codes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Add index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_user_mfa_user ON user_mfa(user_id);

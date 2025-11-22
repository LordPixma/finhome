-- Migration: Add MFA Security Features
-- Created: 2025-11-22
-- Purpose: Add Remember Device, Recovery Email, and MFA Enforcement features

-- Add recovery email column to user_mfa table
ALTER TABLE user_mfa ADD COLUMN recovery_email TEXT;

-- Create trusted_devices table for Remember Device feature
CREATE TABLE IF NOT EXISTS trusted_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  device_name TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  last_used_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Add indexes for trusted devices
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires ON trusted_devices(expires_at);

-- Create tenant_mfa_settings table for MFA enforcement policy
CREATE TABLE IF NOT EXISTS tenant_mfa_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id),
  enforce_mfa INTEGER NOT NULL DEFAULT 0,
  grace_period_days INTEGER NOT NULL DEFAULT 7,
  enforced_at INTEGER,
  enforced_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Add index for tenant MFA settings
CREATE INDEX IF NOT EXISTS idx_tenant_mfa_settings_tenant ON tenant_mfa_settings(tenant_id);

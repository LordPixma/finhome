-- Advanced Global Admin Features Database Schema
-- This extends the existing schema with advanced admin functionality

-- MFA (Multi-Factor Authentication) for Global Admins
CREATE TABLE IF NOT EXISTS global_admin_mfa (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    secret TEXT NOT NULL, -- TOTP secret
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    backup_codes TEXT, -- JSON array of backup codes
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Enhanced Tenant Management
CREATE TABLE IF NOT EXISTS tenant_analytics (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    active_users INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0.0,
    api_requests INTEGER DEFAULT 0,
    storage_used INTEGER DEFAULT 0, -- in bytes
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Tenant Feature Flags
CREATE TABLE IF NOT EXISTS tenant_features (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    config TEXT, -- JSON configuration for the feature
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- System-wide Feature Flags
CREATE TABLE IF NOT EXISTS global_features (
    id TEXT PRIMARY KEY,
    feature_key TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage INTEGER DEFAULT 100, -- 0-100 for gradual rollouts
    config TEXT, -- JSON configuration
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Enhanced Audit Logging
CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    location_info TEXT, -- JSON with city, country, etc.
    login_at INTEGER NOT NULL,
    logout_at INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    mfa_verified BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Security Incidents & Alerts
CREATE TABLE IF NOT EXISTS security_incidents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'failed_login', 'suspicious_activity', 'data_breach', etc.
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    tenant_id TEXT, -- NULL for system-wide incidents
    user_id TEXT,
    description TEXT NOT NULL,
    metadata TEXT, -- JSON with additional data
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
    assigned_to TEXT, -- admin user ID
    resolved_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- System Health Metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id TEXT PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_type TEXT NOT NULL, -- 'counter', 'gauge', 'histogram'
    tags TEXT, -- JSON object with tags
    timestamp INTEGER NOT NULL
);

-- Tenant Billing Information (if you want billing management)
CREATE TABLE IF NOT EXISTS tenant_billing (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL UNIQUE,
    plan_type TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'enterprise'
    billing_email TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start INTEGER,
    current_period_end INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- API Rate Limiting Overrides
CREATE TABLE IF NOT EXISTS tenant_rate_limits (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    endpoint_pattern TEXT NOT NULL, -- e.g., '/api/transactions/*'
    requests_per_minute INTEGER NOT NULL DEFAULT 60,
    requests_per_hour INTEGER NOT NULL DEFAULT 1000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Data Export Requests (GDPR compliance)
CREATE TABLE IF NOT EXISTS data_export_requests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    user_id TEXT,
    request_type TEXT NOT NULL, -- 'user_data', 'tenant_data', 'audit_logs'
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    file_url TEXT, -- S3/R2 URL when completed
    expires_at INTEGER, -- when the download link expires
    requested_by TEXT NOT NULL, -- admin user ID
    processed_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_tenant_date ON tenant_analytics(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant_feature ON tenant_features(tenant_id, feature_key);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_active ON admin_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity_status ON security_incidents(severity, status);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_timestamp ON system_metrics(metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_data_export_status ON data_export_requests(status, created_at);

-- Insert default global features
INSERT OR IGNORE INTO global_features (id, feature_key, is_enabled, description, created_at, updated_at) VALUES
    ('feat_1', 'ai_categorization', true, 'AI-powered transaction categorization', strftime('%s', 'now'), strftime('%s', 'now')),
    ('feat_2', 'advanced_analytics', true, 'Advanced analytics dashboard', strftime('%s', 'now'), strftime('%s', 'now')),
    ('feat_3', 'api_rate_limiting', true, 'API rate limiting system', strftime('%s', 'now'), strftime('%s', 'now')),
    ('feat_4', 'maintenance_mode', false, 'Global maintenance mode', strftime('%s', 'now'), strftime('%s', 'now')),
    ('feat_5', 'new_registrations', true, 'Allow new tenant registrations', strftime('%s', 'now'), strftime('%s', 'now'));
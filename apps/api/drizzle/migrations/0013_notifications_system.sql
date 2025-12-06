-- Migration: Notifications System
-- Adds tables for smart notifications and alerts

-- User Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),

  -- Email preferences
  email_enabled INTEGER DEFAULT 1,
  email_budget_alerts INTEGER DEFAULT 1,
  email_bill_reminders INTEGER DEFAULT 1,
  email_goal_milestones INTEGER DEFAULT 1,
  email_unusual_spending INTEGER DEFAULT 1,
  email_weekly_summary INTEGER DEFAULT 1,
  email_monthly_report INTEGER DEFAULT 0,

  -- Push/In-app preferences
  push_enabled INTEGER DEFAULT 1,
  push_budget_alerts INTEGER DEFAULT 1,
  push_bill_reminders INTEGER DEFAULT 1,
  push_goal_milestones INTEGER DEFAULT 1,
  push_unusual_spending INTEGER DEFAULT 1,
  push_low_balance INTEGER DEFAULT 1,
  push_large_transactions INTEGER DEFAULT 1,

  -- Alert thresholds
  budget_alert_threshold INTEGER DEFAULT 80, -- Percentage of budget used
  low_balance_threshold REAL DEFAULT 100, -- £ amount
  large_transaction_threshold REAL DEFAULT 500, -- £ amount
  unusual_spending_sensitivity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'

  -- Quiet hours
  quiet_hours_enabled INTEGER DEFAULT 0,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',

  -- Frequency settings
  digest_frequency TEXT DEFAULT 'realtime', -- 'realtime', 'daily', 'weekly'

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_notification_preferences_tenant ON notification_preferences(tenant_id);
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE UNIQUE INDEX uniq_notification_preferences_tenant_user ON notification_preferences(tenant_id, user_id);

-- Notifications Table - Store all notifications sent to users
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),

  -- Notification details
  type TEXT NOT NULL, -- 'budget_alert', 'bill_reminder', 'goal_milestone', 'unusual_spending', 'low_balance', 'large_transaction', 'system', 'insight'
  category TEXT NOT NULL, -- 'alert', 'reminder', 'milestone', 'insight', 'system'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- Deep link to relevant page
  action_label TEXT, -- e.g., "View Budget", "Pay Bill"

  -- Icon and styling
  icon TEXT, -- Icon name or emoji
  color TEXT, -- Accent color

  -- Related entities
  related_entity_type TEXT, -- 'budget', 'bill', 'goal', 'transaction', 'account'
  related_entity_id TEXT,

  -- Metadata (JSON)
  metadata TEXT,

  -- Status
  is_read INTEGER DEFAULT 0,
  read_at INTEGER,
  is_dismissed INTEGER DEFAULT 0,
  dismissed_at INTEGER,
  is_actioned INTEGER DEFAULT 0,
  actioned_at INTEGER,

  -- Delivery status
  email_sent INTEGER DEFAULT 0,
  email_sent_at INTEGER,
  push_sent INTEGER DEFAULT 0,
  push_sent_at INTEGER,

  -- Expiry
  expires_at INTEGER,

  created_at INTEGER NOT NULL
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_tenant_user ON notifications(tenant_id, user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notifications_tenant_user_unread ON notifications(tenant_id, user_id, is_read);

-- Alert Rules Table - Custom user-defined alert rules
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),

  -- Rule details
  name TEXT NOT NULL,
  description TEXT,
  is_enabled INTEGER DEFAULT 1,

  -- Rule type and conditions
  rule_type TEXT NOT NULL, -- 'spending', 'balance', 'transaction', 'budget', 'category'
  conditions TEXT NOT NULL, -- JSON defining the rule conditions

  -- Actions to take when triggered
  actions TEXT NOT NULL, -- JSON array of actions: ['notify', 'email', 'push']

  -- Related entities (optional)
  category_id TEXT REFERENCES categories(id),
  account_id TEXT REFERENCES accounts(id),
  budget_id TEXT REFERENCES budgets(id),

  -- Cooldown to prevent spam
  cooldown_minutes INTEGER DEFAULT 60, -- Minimum time between triggers
  last_triggered_at INTEGER,
  trigger_count INTEGER DEFAULT 0,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_alert_rules_tenant ON alert_rules(tenant_id);
CREATE INDEX idx_alert_rules_user ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(is_enabled);
CREATE INDEX idx_alert_rules_type ON alert_rules(rule_type);

-- Notification Batches Table - For digest/summary emails
CREATE TABLE IF NOT EXISTS notification_batches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),

  -- Batch details
  batch_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,

  -- Content summary
  notification_count INTEGER DEFAULT 0,
  notification_ids TEXT, -- JSON array of notification IDs included

  -- Delivery status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at INTEGER,
  error_message TEXT,

  created_at INTEGER NOT NULL
);

CREATE INDEX idx_notification_batches_tenant ON notification_batches(tenant_id);
CREATE INDEX idx_notification_batches_user ON notification_batches(user_id);
CREATE INDEX idx_notification_batches_status ON notification_batches(status);
CREATE INDEX idx_notification_batches_type ON notification_batches(batch_type);

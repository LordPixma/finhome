-- Apply this migration to production D1 database
-- Run via Cloudflare Dashboard or wrangler CLI:
-- wrangler d1 execute finhome-db --remote --file=./apply-import-logs-migration.sql

-- Migration: Add import logs table
CREATE TABLE IF NOT EXISTS `import_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL,
  `user_id` text NOT NULL,
  `account_id` text,
  `file_name` text NOT NULL,
  `file_size` integer NOT NULL,
  `file_type` text NOT NULL,
  `status` text NOT NULL CHECK (`status` IN ('processing', 'success', 'partial', 'failed')),
  `transactions_imported` integer DEFAULT 0 NOT NULL,
  `transactions_failed` integer DEFAULT 0 NOT NULL,
  `transactions_total` integer DEFAULT 0 NOT NULL,
  `error_message` text,
  `error_details` text,
  `processing_time_ms` integer,
  `created_at` integer NOT NULL,
  `completed_at` integer,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_import_logs_tenant` ON `import_logs` (`tenant_id`);
CREATE INDEX IF NOT EXISTS `idx_import_logs_user` ON `import_logs` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_import_logs_status` ON `import_logs` (`status`);
CREATE INDEX IF NOT EXISTS `idx_import_logs_tenant_date` ON `import_logs` (`tenant_id`, `created_at`);

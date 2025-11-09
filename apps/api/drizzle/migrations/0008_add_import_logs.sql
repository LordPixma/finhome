-- Migration: Add import logs table
-- Generated: 2025-11-09

CREATE TABLE IF NOT EXISTS `import_logs` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `tenant_id` TEXT NOT NULL,
  `user_id` TEXT NOT NULL,
  `account_id` TEXT,
  `file_name` TEXT NOT NULL,
  `file_size` INTEGER NOT NULL,
  `file_type` TEXT NOT NULL,
  `status` TEXT NOT NULL CHECK (`status` IN ('processing', 'success', 'partial', 'failed')),
  `transactions_imported` INTEGER NOT NULL DEFAULT 0,
  `transactions_failed` INTEGER NOT NULL DEFAULT 0,
  `transactions_total` INTEGER NOT NULL DEFAULT 0,
  `error_message` TEXT,
  `error_details` TEXT,
  `processing_time_ms` INTEGER,
  `created_at` INTEGER NOT NULL,
  `completed_at` INTEGER,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS `idx_import_logs_tenant` ON `import_logs` (`tenant_id`);
CREATE INDEX IF NOT EXISTS `idx_import_logs_user` ON `import_logs` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_import_logs_status` ON `import_logs` (`status`);
CREATE INDEX IF NOT EXISTS `idx_import_logs_tenant_date` ON `import_logs` (`tenant_id`, `created_at`);

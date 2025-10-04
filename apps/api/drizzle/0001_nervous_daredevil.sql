CREATE TABLE `tenant_members` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`invited_by` text,
	`invited_at` integer NOT NULL,
	`joined_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`currency` text DEFAULT 'GBP' NOT NULL,
	`currency_symbol` text DEFAULT '£' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`timezone` text DEFAULT 'Europe/London' NOT NULL,
	`date_format` text DEFAULT 'DD/MM/YYYY' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
/*
 SQLite does not support "Set default to column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
CREATE INDEX `idx_tenant_members_tenant` ON `tenant_members` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_tenant_members_user` ON `tenant_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_tenant_members_tenant_status` ON `tenant_members` (`tenant_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_settings_user` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_accounts_tenant` ON `accounts` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_accounts_type` ON `accounts` (`type`);--> statement-breakpoint
CREATE INDEX `idx_bill_reminders_tenant` ON `bill_reminders` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_bill_reminders_due_date` ON `bill_reminders` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_bill_reminders_status` ON `bill_reminders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_bill_reminders_tenant_status` ON `bill_reminders` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_budgets_tenant` ON `budgets` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_budgets_category` ON `budgets` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_budgets_period` ON `budgets` (`period`);--> statement-breakpoint
CREATE INDEX `idx_budgets_start_date` ON `budgets` (`start_date`);--> statement-breakpoint
CREATE INDEX `idx_categories_tenant_type` ON `categories` (`tenant_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_categories_parent` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_goal_contributions_goal` ON `goal_contributions` (`goal_id`);--> statement-breakpoint
CREATE INDEX `idx_goal_contributions_date` ON `goal_contributions` (`date`);--> statement-breakpoint
CREATE INDEX `idx_goal_contributions_transaction` ON `goal_contributions` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_goals_tenant_status` ON `goals` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_goals_deadline` ON `goals` (`deadline`);--> statement-breakpoint
CREATE INDEX `idx_goals_account` ON `goals` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_recurring_tenant` ON `recurring_transactions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_recurring_next_date` ON `recurring_transactions` (`next_date`);--> statement-breakpoint
CREATE INDEX `idx_recurring_status` ON `recurring_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_recurring_auto_create` ON `recurring_transactions` (`auto_create`);--> statement-breakpoint
CREATE INDEX `idx_transactions_tenant_date` ON `transactions` (`tenant_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_transactions_tenant_category` ON `transactions` (`tenant_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_tenant_type` ON `transactions` (`tenant_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_date` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_users_tenant` ON `users` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);
CREATE TABLE `period_records` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE, `start_date` text NOT NULL, `end_date` text, `notes` text, `legacy_start_id` text, `archived` integer DEFAULT false NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `period_records_user_start` ON `period_records` (`user_id`,`start_date`);
--> statement-breakpoint
CREATE TABLE `cycle_daily_logs` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE, `date` text NOT NULL, `flow` text DEFAULT 'none' NOT NULL, `pain` integer DEFAULT 0 NOT NULL, `mood` text DEFAULT 'neutral' NOT NULL, `symptoms` text DEFAULT '[]' NOT NULL, `notes` text, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `cycle_daily_logs_user_date` ON `cycle_daily_logs` (`user_id`,`date`);
--> statement-breakpoint
CREATE TABLE `self_care_items` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE, `title` text NOT NULL, `description` text, `category` text DEFAULT 'personal' NOT NULL, `time_of_day` text DEFAULT 'anytime' NOT NULL, `weekdays` text DEFAULT '[0,1,2,3,4,5,6]' NOT NULL, `target_value` real DEFAULT 1 NOT NULL, `unit` text DEFAULT 'بار' NOT NULL, `archived` integer DEFAULT false NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `self_care_logs` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE, `item_id` text NOT NULL REFERENCES `self_care_items`(`id`) ON DELETE CASCADE, `date` text NOT NULL, `value` real DEFAULT 0 NOT NULL, `target_value` real NOT NULL, `title_snapshot` text NOT NULL, `unit_snapshot` text NOT NULL, `notes` text, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `self_care_logs_item_date` ON `self_care_logs` (`item_id`,`date`);

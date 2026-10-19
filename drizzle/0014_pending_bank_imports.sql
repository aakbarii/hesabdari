ALTER TABLE `user_settings` ADD `sms_ingest_token` text;
--> statement-breakpoint
CREATE TABLE `pending_bank_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`raw_text` text NOT NULL,
	`sender` text,
	`suggested_type` text,
	`suggested_amount` integer,
	`suggested_title` text,
	`suggested_date` text,
	`suggested_account_id` text,
	`suggested_category_id` text,
	`confidence` integer DEFAULT 50 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`parse_source` text DEFAULT 'heuristic' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

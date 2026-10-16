ALTER TABLE `users` ADD `totp_secret` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `totp_pending_secret` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `totp_enabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `onboarding_completed` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `pending_2fa_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

ALTER TABLE `households` ADD `invite_token` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `households_invite_token_unique` ON `households` (`invite_token`);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `household_id` text REFERENCES `households`(`id`);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `is_shared` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `transaction_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`user_id` text NOT NULL,
	`share_percent` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

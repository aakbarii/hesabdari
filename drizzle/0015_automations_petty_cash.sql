CREATE TABLE `group_petty_cash` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`manager_user_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`monthly_budget` integer DEFAULT 0 NOT NULL,
	`title` text DEFAULT 'تنخواه' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `group_petty_cash_items` (
	`id` text PRIMARY KEY NOT NULL,
	`petty_cash_id` text NOT NULL,
	`group_id` text NOT NULL,
	`created_by` text NOT NULL,
	`title` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`notes` text,
	`receipt_path` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`petty_cash_id`) REFERENCES `group_petty_cash`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `weekly_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`locale` text DEFAULT 'fa' NOT NULL,
	`content` text NOT NULL,
	`suggestions_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

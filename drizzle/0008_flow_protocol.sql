CREATE TABLE `flow_days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day_date` text NOT NULL,
	`boulder_todo_id` text,
	`prediction_percent` integer,
	`boulder_done` integer DEFAULT 0 NOT NULL,
	`evening_done` integer DEFAULT 0 NOT NULL,
	`why_notes` text,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`boulder_todo_id`) REFERENCES `todos`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flow_days_user_date_uidx` ON `flow_days` (`user_id`,`day_date`);
--> statement-breakpoint
CREATE TABLE `flow_day_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_day_id` text NOT NULL,
	`todo_id` text NOT NULL,
	`is_boulder` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`flow_day_id`) REFERENCES `flow_days`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`todo_id`) REFERENCES `todos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flow_focus_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day_date` text NOT NULL,
	`started_at` integer NOT NULL,
	`planned_seconds` integer NOT NULL,
	`ended_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`interruption_tags` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flow_mind_inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`cleared_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

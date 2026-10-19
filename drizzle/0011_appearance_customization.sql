ALTER TABLE `user_settings` ADD `appearance_mood` text DEFAULT 'neutral' NOT NULL;
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `accent_color` text DEFAULT 'emerald' NOT NULL;
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `visible_nav` text;

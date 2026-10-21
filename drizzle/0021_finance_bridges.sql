CREATE TABLE IF NOT EXISTS `asset_price_history` (
  `id` text PRIMARY KEY NOT NULL,
  `asset_id` text NOT NULL,
  `user_id` text NOT NULL,
  `unit_price` integer NOT NULL,
  `recorded_at` integer NOT NULL,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `asset_price_history_asset_idx` ON `asset_price_history` (`asset_id`,`recorded_at`);

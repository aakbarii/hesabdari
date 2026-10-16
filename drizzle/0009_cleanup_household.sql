DROP TABLE IF EXISTS `transaction_splits`;
--> statement-breakpoint
DROP TABLE IF EXISTS `household_members`;
--> statement-breakpoint
ALTER TABLE `transactions` DROP COLUMN `household_id`;
--> statement-breakpoint
ALTER TABLE `transactions` DROP COLUMN `is_shared`;
--> statement-breakpoint
ALTER TABLE `budgets` DROP COLUMN `household_id`;
--> statement-breakpoint
DROP TABLE IF EXISTS `households`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `transactions_user_date_idx` ON `transactions` (`user_id`,`date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `transactions_user_type_cat_date_idx` ON `transactions` (`user_id`,`type`,`category_id`,`date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `todos_user_status_idx` ON `todos` (`user_id`,`status`);
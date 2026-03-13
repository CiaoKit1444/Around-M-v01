ALTER TABLE `peppr_users` ADD `reset_token_hash` text;--> statement-breakpoint
ALTER TABLE `peppr_users` ADD `reset_token_expires_at` timestamp;
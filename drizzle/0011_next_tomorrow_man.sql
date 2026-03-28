CREATE TABLE `tfa_recovery_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`challenge_token` varchar(512) NOT NULL,
	`otp_hash` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`used` boolean NOT NULL DEFAULT false,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tfa_recovery_tokens_id` PRIMARY KEY(`id`)
);

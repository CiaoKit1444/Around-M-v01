CREATE TABLE `peppr_inbox_state` (
	`user_id` varchar(36) NOT NULL,
	`last_read_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_inbox_state_user_id` PRIMARY KEY(`user_id`)
);

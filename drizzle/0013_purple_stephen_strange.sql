CREATE TABLE `peppr_archived_notifications` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(20) NOT NULL,
	`title` text NOT NULL,
	`message` text,
	`path` varchar(512),
	`request_id` varchar(64),
	`request_status` varchar(32),
	`property_id` varchar(64),
	`property_name` varchar(255),
	`original_timestamp` timestamp NOT NULL,
	`archived_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `peppr_archived_notifications_id` PRIMARY KEY(`id`)
);

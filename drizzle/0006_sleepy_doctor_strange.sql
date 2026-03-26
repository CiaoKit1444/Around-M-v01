CREATE TABLE `peppr_service_operators` (
	`id` varchar(36) NOT NULL,
	`provider_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`display_name` varchar(200) NOT NULL,
	`specialisation` varchar(50) NOT NULL DEFAULT 'GENERAL',
	`status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_service_operators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_so_jobs` (
	`id` varchar(36) NOT NULL,
	`ticket_id` varchar(36) NOT NULL,
	`operator_id` varchar(36) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'DISPATCHED',
	`stage_notes` text,
	`stage_history` json DEFAULT ('[]'),
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	`started_at` timestamp,
	`completed_at` timestamp,
	`cancelled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_so_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_sp_tickets` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`provider_id` varchar(36) NOT NULL,
	`item_ids` json DEFAULT ('[]'),
	`status` varchar(20) NOT NULL DEFAULT 'OPEN',
	`sp_admin_notes` text,
	`decline_reason` text,
	`accepted_at` timestamp,
	`dispatched_at` timestamp,
	`closed_at` timestamp,
	`cancelled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_sp_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `peppr_payments` MODIFY COLUMN `amount` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `peppr_payments` MODIFY COLUMN `status` varchar(20) NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `peppr_payments` ADD `gateway_charge_id` varchar(200);--> statement-breakpoint
ALTER TABLE `peppr_payments` ADD `qr_data_url` text;--> statement-breakpoint
ALTER TABLE `peppr_payments` ADD `expires_at` timestamp;--> statement-breakpoint
ALTER TABLE `peppr_payments` ADD `paid_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `fontSizePref` enum('S','M','L') DEFAULT 'M' NOT NULL;--> statement-breakpoint
ALTER TABLE `peppr_payments` DROP COLUMN `qr_expires_at`;
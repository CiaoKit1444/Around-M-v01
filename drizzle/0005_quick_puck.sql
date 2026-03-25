CREATE TABLE `peppr_payments` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`method` varchar(20) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'THB',
	`gateway_ref` varchar(200),
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`qr_payload` text,
	`qr_expires_at` timestamp,
	`confirmed_at` timestamp,
	`failed_at` timestamp,
	`failure_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_request_events` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`from_state` varchar(50),
	`to_state` varchar(50) NOT NULL,
	`actor_id` varchar(36),
	`actor_type` varchar(20) NOT NULL,
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `peppr_request_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_request_notes` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`author_id` varchar(36),
	`author_type` varchar(20) NOT NULL,
	`content` text NOT NULL,
	`is_internal` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `peppr_request_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_sp_assignments` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`provider_id` varchar(36) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	`accepted_at` timestamp,
	`rejected_at` timestamp,
	`rejection_reason` text,
	`estimated_arrival` timestamp,
	`assigned_staff_name` varchar(200),
	`delivery_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_sp_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `peppr_service_requests` MODIFY COLUMN `status` varchar(30) NOT NULL DEFAULT 'SUBMITTED';--> statement-breakpoint
ALTER TABLE `peppr_service_requests` ADD `matching_mode` varchar(10) DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `peppr_service_requests` ADD `sla_deadline` timestamp;--> statement-breakpoint
ALTER TABLE `peppr_service_requests` ADD `assigned_provider_id` varchar(36);--> statement-breakpoint
ALTER TABLE `peppr_service_requests` ADD `auto_confirmed` boolean DEFAULT false NOT NULL;
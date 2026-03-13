CREATE TABLE `peppr_catalog_items` (
	`id` varchar(36) NOT NULL,
	`provider_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sku` varchar(100) NOT NULL,
	`category` varchar(100) NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'THB',
	`unit` varchar(50) NOT NULL DEFAULT 'each',
	`duration_minutes` int,
	`terms` text,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_catalog_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_guest_sessions` (
	`id` varchar(36) NOT NULL,
	`qr_code_id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`room_id` varchar(36) NOT NULL,
	`guest_name` varchar(255),
	`access_type` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_guest_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_partners` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`address` text,
	`contact_person` varchar(255),
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_properties` (
	`id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`country` varchar(100) NOT NULL,
	`timezone` varchar(50) NOT NULL DEFAULT 'UTC',
	`currency` varchar(10) NOT NULL DEFAULT 'THB',
	`phone` varchar(50),
	`email` varchar(255),
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_property_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`logo_url` text,
	`primary_color` varchar(20),
	`secondary_color` varchar(20),
	`welcome_message` text,
	`qr_validation_limit` int DEFAULT 100,
	`service_catalog_limit` int DEFAULT 50,
	`request_submission_limit` int DEFAULT 10,
	`enable_guest_cancellation` boolean DEFAULT true,
	`enable_alternative_proposals` boolean DEFAULT false,
	`enable_direct_messaging` boolean DEFAULT false,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_property_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `peppr_property_config_property_id_unique` UNIQUE(`property_id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_qr_codes` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`room_id` varchar(36) NOT NULL,
	`qr_code_id` varchar(100) NOT NULL,
	`access_type` varchar(20) NOT NULL DEFAULT 'public',
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`last_scanned` timestamp,
	`scan_count` int NOT NULL DEFAULT 0,
	`expires_at` timestamp,
	`revoked_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_qr_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `peppr_qr_codes_qr_code_id_unique` UNIQUE(`qr_code_id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_request_items` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`template_item_id` varchar(36),
	`item_name` varchar(255) NOT NULL,
	`item_category` varchar(100) NOT NULL,
	`unit_price` decimal(12,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`included_quantity` int NOT NULL DEFAULT 0,
	`billable_quantity` int NOT NULL DEFAULT 1,
	`line_total` decimal(12,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'THB',
	`guest_notes` text,
	`status` varchar(20) NOT NULL DEFAULT 'PENDING',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `peppr_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_room_template_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `peppr_room_template_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_rooms` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`room_number` varchar(50) NOT NULL,
	`floor` varchar(20),
	`zone` varchar(50),
	`room_type` varchar(50) NOT NULL,
	`template_id` varchar(36),
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_service_providers` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`category` varchar(100) NOT NULL,
	`service_area` varchar(255) NOT NULL,
	`contact_person` varchar(255),
	`rating` decimal(3,2),
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_service_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_service_requests` (
	`id` varchar(36) NOT NULL,
	`request_number` varchar(50) NOT NULL,
	`session_id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`room_id` varchar(36) NOT NULL,
	`guest_name` varchar(255),
	`guest_phone` varchar(50),
	`guest_notes` text,
	`preferred_datetime` timestamp,
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`total_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`currency` varchar(10) NOT NULL DEFAULT 'THB',
	`status` varchar(20) NOT NULL DEFAULT 'PENDING',
	`status_reason` text,
	`confirmed_at` timestamp,
	`completed_at` timestamp,
	`cancelled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_service_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `peppr_service_requests_request_number_unique` UNIQUE(`request_number`)
);
--> statement-breakpoint
CREATE TABLE `peppr_service_templates` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`tier` varchar(50) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_service_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_staff_members` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`position_id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_staff_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_staff_positions` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`department` varchar(100) NOT NULL,
	`property_id` varchar(36),
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_staff_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_stay_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(100) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`room_id` varchar(36) NOT NULL,
	`room_number` varchar(50),
	`expires_at` timestamp NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `peppr_stay_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `peppr_stay_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `peppr_template_items` (
	`id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`catalog_item_id` varchar(36) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `peppr_template_items_id` PRIMARY KEY(`id`)
);

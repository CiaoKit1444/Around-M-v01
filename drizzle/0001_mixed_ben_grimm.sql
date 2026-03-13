CREATE TABLE `peppr_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_type` varchar(20) NOT NULL DEFAULT 'USER',
	`actor_id` varchar(36),
	`action` varchar(50) NOT NULL,
	`resource_type` varchar(50),
	`resource_id` varchar(36),
	`details` json,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `peppr_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_sso_allowlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`note` text,
	`added_by` varchar(36),
	`status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`removed_at` timestamp,
	CONSTRAINT `peppr_sso_allowlist_id` PRIMARY KEY(`id`),
	CONSTRAINT `peppr_sso_allowlist_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `peppr_user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role_id` varchar(100) NOT NULL,
	`granted_at` timestamp NOT NULL DEFAULT (now()),
	`granted_by` varchar(36),
	CONSTRAINT `peppr_user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peppr_users` (
	`user_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`mobile` varchar(20),
	`role` varchar(50) NOT NULL DEFAULT 'USER',
	`position_id` varchar(100),
	`partner_id` varchar(36),
	`property_id` varchar(36),
	`email_verified` boolean NOT NULL DEFAULT false,
	`status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
	`failed_login_attempts` int NOT NULL DEFAULT 0,
	`locked_until` timestamp,
	`last_login_at` timestamp,
	`last_login_ip` varchar(45),
	`requires_2fa` boolean NOT NULL DEFAULT false,
	`twofa_enabled` boolean NOT NULL DEFAULT false,
	`twofa_secret` text,
	`twofa_method` varchar(20),
	`twofa_backup_codes` json,
	`sso_provider` varchar(50),
	`sso_provider_id` varchar(255),
	`manus_open_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_users_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `peppr_users_email_unique` UNIQUE(`email`)
);

CREATE TABLE `peppr_property_banners` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`type` varchar(30) NOT NULL DEFAULT 'announcement',
	`title` varchar(200) NOT NULL,
	`body` text,
	`image_url` text,
	`link_url` text,
	`link_label` varchar(100),
	`locale` varchar(10),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`starts_at` timestamp,
	`ends_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peppr_property_banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `peppr_property_config` ADD `greeting_config` json;
CREATE TABLE `jti_revocations` (
	`jti` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`reason` varchar(50) NOT NULL DEFAULT 'logout',
	`revoked_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `jti_revocations_jti` PRIMARY KEY(`jti`)
);

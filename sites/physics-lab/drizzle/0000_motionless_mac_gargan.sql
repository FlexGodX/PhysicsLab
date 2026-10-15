CREATE TABLE `ai_provider_preferences` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_provider_settings` (
	`owner_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`base_url` text NOT NULL,
	`key_cipher` text NOT NULL,
	`env_key_disabled` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner_id`, `provider`)
);

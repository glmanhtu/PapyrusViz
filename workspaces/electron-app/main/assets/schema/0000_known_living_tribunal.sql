CREATE TABLE `assembling` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`group` text,
	`status` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`project_id` integer,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`path` text,
	`is_activated` integer,
	`project_id` integer,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `img` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`path` text,
	`thumbnail` text,
	`width` integer,
	`height` integer,
	`status` integer DEFAULT 1,
	`format` text,
	`dir_id` integer,
	FOREIGN KEY (`dir_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `img_assembling` (
	`img_id` integer,
	`assembling_id` integer,
	`transforms` text,
	PRIMARY KEY(`assembling_id`, `img_id`),
	FOREIGN KEY (`img_id`) REFERENCES `img`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assembling_id`) REFERENCES `assembling`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matching-img-record` (
	`img_id` integer NOT NULL,
	`matching_record_id` integer NOT NULL,
	`matching_id` integer,
	PRIMARY KEY(`img_id`, `matching_record_id`),
	FOREIGN KEY (`img_id`) REFERENCES `img`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matching_record_id`) REFERENCES `matching-record`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matching_id`) REFERENCES `matching`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matching-record-score` (
	`source_id` integer NOT NULL,
	`target_id` integer NOT NULL,
	`score` real,
	`rank` integer,
	`matching_id` integer,
	PRIMARY KEY(`source_id`, `target_id`),
	FOREIGN KEY (`source_id`) REFERENCES `matching-record`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_id`) REFERENCES `matching-record`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matching_id`) REFERENCES `matching`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matching-record` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`matching_id` integer,
	FOREIGN KEY (`matching_id`) REFERENCES `matching`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matching` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`matrix_path` text,
	`matching_type` text,
	`matching_method` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`project_id` integer,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`path` text,
	`data_path` text,
	`os` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `user_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `dir_path_index` ON `category` (`path`);--> statement-breakpoint
CREATE INDEX `img_path_idx` ON `img` (`path`);--> statement-breakpoint
CREATE INDEX `img_status_idx` ON `img` (`status`);--> statement-breakpoint
CREATE INDEX `img_name_idx` ON `img` (`name`);--> statement-breakpoint
CREATE INDEX `matrix_path_index` ON `matching` (`matrix_path`);--> statement-breakpoint
CREATE UNIQUE INDEX `proj_path_index` ON `project` (`path`);
CREATE TABLE `assembling` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`group` text,
	`is_activated` integer,
	`img_count` integer,
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
CREATE TABLE `img_assembling` (
	`img_id` integer,
	`assembling_id` integer,
	`transforms` text,
	PRIMARY KEY(`assembling_id`, `img_id`),
	FOREIGN KEY (`img_id`) REFERENCES `img`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assembling_id`) REFERENCES `assembling`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `img` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`path` text,
	`thumbnail` text,
	`width` integer,
	`height` integer,
	`format` text,
	`dir_id` integer,
	FOREIGN KEY (`dir_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matching` (
	`source_img_id` integer,
	`target_img_id` integer,
	`score` real,
	PRIMARY KEY(`source_img_id`, `target_img_id`),
	FOREIGN KEY (`source_img_id`) REFERENCES `img`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_img_id`) REFERENCES `img`(`id`) ON UPDATE no action ON DELETE no action
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
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text,
	`value` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `dir_path_index` ON `category` (`path`);--> statement-breakpoint
CREATE INDEX `img_path_idx` ON `img` (`path`);--> statement-breakpoint
CREATE UNIQUE INDEX `proj_path_index` ON `project` (`path`);
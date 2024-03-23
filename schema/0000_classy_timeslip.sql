CREATE TABLE `assembling` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`group` text,
	`is_activated` integer,
	`img_count` integer,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`project_id` integer,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `dir` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`path` text,
	`project_id` integer,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `img` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`path` text,
	`thumbnail` text,
	`width` integer,
	`height` integer,
	`format` text,
	`size` integer,
	`dir_id` integer,
	FOREIGN KEY (`dir_id`) REFERENCES `dir`(`id`) ON UPDATE no action ON DELETE no action
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
CREATE TABLE `project` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`path` text,
	`data_path` text,
	`os` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dirPathIndex` ON `dir` (`path`);--> statement-breakpoint
CREATE INDEX `imgPathIdx` ON `img` (`path`);--> statement-breakpoint
CREATE UNIQUE INDEX `projPathIndex` ON `project` (`path`);
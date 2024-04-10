ALTER TABLE img ADD `status` integer DEFAULT 1;--> statement-breakpoint
CREATE INDEX `img_status_idx` ON `img` (`status`);
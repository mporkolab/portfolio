CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`original_name` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`size` integer NOT NULL,
	`share_ext` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_copies` (
	`project_id` integer NOT NULL,
	`lang` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`blurb` text DEFAULT '' NOT NULL,
	`content_json` text,
	`content_html` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`project_id`, `lang`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`featured` integer DEFAULT false NOT NULL,
	`live_url` text,
	`stack` text DEFAULT '' NOT NULL,
	`cover_image_id` text,
	`cover_is_logo` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`cover_image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `projects_public_idx` ON `projects` (`status`,`featured`,`published_at`);
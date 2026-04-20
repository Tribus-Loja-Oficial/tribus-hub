ALTER TABLE "pages" ADD COLUMN "is_folder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
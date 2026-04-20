CREATE TYPE "public"."okr_link_relation_type" AS ENUM('contributes_to', 'supports', 'indirect');--> statement-breakpoint
CREATE TYPE "public"."project_health_status" AS ENUM('on_track', 'at_risk', 'blocked', 'off_track');--> statement-breakpoint
CREATE TABLE "pm_project_okr_kr_links" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"okr_kr_id" text NOT NULL,
	"relation_type" "okr_link_relation_type" DEFAULT 'contributes_to' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_project_okr_objective_links" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"okr_objective_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "health_status" "project_health_status";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "progress_percent" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pm_project_okr_kr_links" ADD CONSTRAINT "pm_project_okr_kr_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_project_okr_kr_links" ADD CONSTRAINT "pm_project_okr_kr_links_okr_kr_id_okr_key_results_id_fk" FOREIGN KEY ("okr_kr_id") REFERENCES "public"."okr_key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_project_okr_objective_links" ADD CONSTRAINT "pm_project_okr_objective_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_project_okr_objective_links" ADD CONSTRAINT "pm_project_okr_objective_links_okr_objective_id_okr_objectives_id_fk" FOREIGN KEY ("okr_objective_id") REFERENCES "public"."okr_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pm_proj_okr_kr_project_idx" ON "pm_project_okr_kr_links" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "pm_proj_okr_obj_project_idx" ON "pm_project_okr_objective_links" USING btree ("project_id");
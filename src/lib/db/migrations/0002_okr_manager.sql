CREATE TYPE "public"."okr_cycle_status" AS ENUM('planned', 'active', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."okr_objective_status" AS ENUM('draft', 'on_track', 'at_risk', 'off_track', 'completed');--> statement-breakpoint
CREATE TYPE "public"."okr_key_result_status" AS ENUM('draft', 'on_track', 'at_risk', 'off_track', 'completed');--> statement-breakpoint
CREATE TYPE "public"."okr_metric_type" AS ENUM('percentage', 'number', 'currency', 'boolean', 'custom');--> statement-breakpoint
CREATE TYPE "public"."okr_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint

CREATE TABLE "okr_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "okr_cycle_status" DEFAULT 'planned' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "okr_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color_token" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okr_objectives" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"cycle_id" text,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description_json" json,
	"description_text" text,
	"owner_user_id" text,
	"status" "okr_objective_status" DEFAULT 'draft' NOT NULL,
	"progress_percent" double precision DEFAULT 0 NOT NULL,
	"priority" "okr_priority" DEFAULT 'medium' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"start_date" date,
	"target_date" date,
	"completed_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "okr_objective_groups" (
	"objective_id" text NOT NULL,
	"group_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okr_key_results" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"cycle_id" text,
	"objective_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description_json" json,
	"description_text" text,
	"owner_user_id" text,
	"metric_type" "okr_metric_type" DEFAULT 'number' NOT NULL,
	"unit" text,
	"start_value" double precision DEFAULT 0 NOT NULL,
	"current_value" double precision DEFAULT 0 NOT NULL,
	"target_value" double precision DEFAULT 100 NOT NULL,
	"progress_percent" double precision DEFAULT 0 NOT NULL,
	"status" "okr_key_result_status" DEFAULT 'draft' NOT NULL,
	"confidence" integer DEFAULT 50,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"start_date" date,
	"target_date" date,
	"completed_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "okr_key_result_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"key_result_id" text NOT NULL,
	"previous_value" double precision NOT NULL,
	"new_value" double precision NOT NULL,
	"comment" text,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Foreign keys
ALTER TABLE "okr_cycles" ADD CONSTRAINT "okr_cycles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_cycles" ADD CONSTRAINT "okr_cycles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_cycles" ADD CONSTRAINT "okr_cycles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "okr_groups" ADD CONSTRAINT "okr_groups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "okr_objectives" ADD CONSTRAINT "okr_objectives_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_objectives" ADD CONSTRAINT "okr_objectives_cycle_id_okr_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."okr_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_objectives" ADD CONSTRAINT "okr_objectives_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_objectives" ADD CONSTRAINT "okr_objectives_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_objectives" ADD CONSTRAINT "okr_objectives_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "okr_objective_groups" ADD CONSTRAINT "okr_objective_groups_objective_id_okr_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."okr_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_objective_groups" ADD CONSTRAINT "okr_objective_groups_group_id_okr_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."okr_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "okr_key_results" ADD CONSTRAINT "okr_key_results_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_results" ADD CONSTRAINT "okr_key_results_cycle_id_okr_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."okr_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_results" ADD CONSTRAINT "okr_key_results_objective_id_okr_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."okr_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_results" ADD CONSTRAINT "okr_key_results_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_results" ADD CONSTRAINT "okr_key_results_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_results" ADD CONSTRAINT "okr_key_results_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "okr_key_result_updates" ADD CONSTRAINT "okr_key_result_updates_key_result_id_okr_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."okr_key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_result_updates" ADD CONSTRAINT "okr_key_result_updates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Indexes
CREATE INDEX "okr_cycles_workspace_idx" ON "okr_cycles" ("workspace_id");--> statement-breakpoint
CREATE INDEX "okr_cycles_status_idx" ON "okr_cycles" ("status");--> statement-breakpoint
CREATE INDEX "okr_groups_workspace_idx" ON "okr_groups" ("workspace_id");--> statement-breakpoint
CREATE INDEX "okr_objectives_workspace_idx" ON "okr_objectives" ("workspace_id");--> statement-breakpoint
CREATE INDEX "okr_objectives_cycle_idx" ON "okr_objectives" ("cycle_id");--> statement-breakpoint
CREATE INDEX "okr_objectives_status_idx" ON "okr_objectives" ("status");--> statement-breakpoint
CREATE INDEX "okr_key_results_workspace_idx" ON "okr_key_results" ("workspace_id");--> statement-breakpoint
CREATE INDEX "okr_key_results_objective_idx" ON "okr_key_results" ("objective_id");--> statement-breakpoint
CREATE INDEX "okr_key_results_cycle_idx" ON "okr_key_results" ("cycle_id");--> statement-breakpoint
CREATE INDEX "okr_key_results_status_idx" ON "okr_key_results" ("status");--> statement-breakpoint
CREATE INDEX "okr_kr_updates_key_result_idx" ON "okr_key_result_updates" ("key_result_id");

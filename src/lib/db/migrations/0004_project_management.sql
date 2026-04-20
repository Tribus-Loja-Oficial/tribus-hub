-- Project Management Module: schema extensions
-- Adds health status, progress, and OKR link tables to the projects module

DO $$ BEGIN
  CREATE TYPE "project_health_status" AS ENUM('on_track', 'at_risk', 'blocked', 'off_track');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "okr_link_relation_type" AS ENUM('contributes_to', 'supports', 'indirect');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add health_status and progress_percent to projects
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "health_status" "project_health_status",
  ADD COLUMN IF NOT EXISTS "progress_percent" double precision NOT NULL DEFAULT 0;

-- OKR link: project → okr_objective
CREATE TABLE IF NOT EXISTS "pm_project_okr_objective_links" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "okr_objective_id" text NOT NULL REFERENCES "okr_objectives"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pm_proj_okr_obj_project_idx"
  ON "pm_project_okr_objective_links"("project_id");

-- OKR link: project → okr_key_result
CREATE TABLE IF NOT EXISTS "pm_project_okr_kr_links" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "okr_kr_id" text NOT NULL REFERENCES "okr_key_results"("id") ON DELETE CASCADE,
  "relation_type" "okr_link_relation_type" NOT NULL DEFAULT 'contributes_to',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pm_proj_okr_kr_project_idx"
  ON "pm_project_okr_kr_links"("project_id");

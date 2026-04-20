ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "priority" "project_priority" NOT NULL DEFAULT 'medium';

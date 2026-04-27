-- Global cycle support for projects (reuse okr_cycles as workspace cycle registry).
ALTER TABLE projects ADD COLUMN cycle_id TEXT;
CREATE INDEX IF NOT EXISTS idx_projects_workspace_cycle ON projects(workspace_id, cycle_id);
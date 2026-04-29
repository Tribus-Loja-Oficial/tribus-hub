-- Allow explicit manual blocked status for milestones.
-- D1 remote execution: keep statements sequential (no BEGIN/COMMIT in SQL file).

PRAGMA foreign_keys = OFF;

CREATE TABLE milestones_new (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  completed_at TEXT,
  owner_user_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  health_snapshot_json TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK (status IN ('pending', 'in_progress', 'completed', 'missed', 'blocked')),
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

INSERT INTO milestones_new (
  id, project_id, title, description, status, priority, due_date, completed_at, owner_user_id,
  sort_order, created_at, updated_at, health_snapshot_json
)
SELECT
  id, project_id, title, description, status, priority, due_date, completed_at, owner_user_id,
  sort_order, created_at, updated_at, health_snapshot_json
FROM milestones;

DROP TABLE milestones;
ALTER TABLE milestones_new RENAME TO milestones;

CREATE INDEX IF NOT EXISTS idx_milestones_project_sort ON milestones(project_id, sort_order);

PRAGMA foreign_keys = ON;

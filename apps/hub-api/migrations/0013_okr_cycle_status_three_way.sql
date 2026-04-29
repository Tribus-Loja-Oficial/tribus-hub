-- Collapse cycle lifecycle to planned | active | closed only (remove archived).
-- Data: archived rows become closed before rebuilding CHECK constraint.
-- Nota: D1 remote (wrangler --remote) não aceita BEGIN/COMMIT em ficheiros .sql — executar em sequência só.

PRAGMA foreign_keys = OFF;

UPDATE okr_cycles SET status = 'closed', archived_at = COALESCE(archived_at, datetime('now'))
WHERE status = 'archived';

CREATE TABLE okr_cycles_new (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (status IN ('planned', 'active', 'closed'))
);

INSERT INTO okr_cycles_new
SELECT * FROM okr_cycles;

DROP TABLE okr_cycles;

ALTER TABLE okr_cycles_new RENAME TO okr_cycles;

CREATE INDEX IF NOT EXISTS idx_okr_cycles_workspace_status
  ON okr_cycles(workspace_id, status);

PRAGMA foreign_keys = ON;

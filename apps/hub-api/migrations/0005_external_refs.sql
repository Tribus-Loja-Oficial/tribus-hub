-- Stable human-facing references for entities (for ingestion and UI copy/paste).
-- Idempotent and replay-safe.

CREATE TABLE IF NOT EXISTS entity_external_refs (
  workspace_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  external_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, entity_type, entity_id),
  UNIQUE (workspace_id, entity_type, external_ref),
  CHECK (entity_type IN ('user', 'project', 'milestone', 'task', 'okr_cycle', 'okr_objective', 'okr_key_result'))
);

CREATE INDEX IF NOT EXISTS idx_entity_external_refs_lookup
  ON entity_external_refs(workspace_id, entity_type, external_ref);

INSERT OR IGNORE INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'user', id, 'USR-' || UPPER(SUBSTR(id, 1, 8)), datetime('now'), datetime('now')
FROM users
WHERE is_active = 1;

INSERT OR IGNORE INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'project', id, 'PRJ-' || UPPER(SUBSTR(id, 1, 8)), datetime('now'), datetime('now')
FROM projects
WHERE deleted_at IS NULL;

INSERT OR IGNORE INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT p.workspace_id, 'milestone', m.id, 'MS-' || UPPER(SUBSTR(m.id, 1, 8)), datetime('now'), datetime('now')
FROM milestones m
INNER JOIN projects p ON p.id = m.project_id;

INSERT OR IGNORE INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'task', id, 'TSK-' || UPPER(SUBSTR(id, 1, 8)), datetime('now'), datetime('now')
FROM tasks
WHERE deleted_at IS NULL;

INSERT OR IGNORE INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'okr_cycle', id, 'CYC-' || UPPER(SUBSTR(id, 1, 8)), datetime('now'), datetime('now')
FROM okr_cycles
WHERE deleted_at IS NULL;

INSERT OR IGNORE INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'okr_objective', id, 'OBJ-' || UPPER(SUBSTR(id, 1, 8)), datetime('now'), datetime('now')
FROM okr_objectives
WHERE deleted_at IS NULL;

INSERT OR IGNORE INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'okr_key_result', id, 'KR-' || UPPER(SUBSTR(id, 1, 8)), datetime('now'), datetime('now')
FROM okr_key_results
WHERE deleted_at IS NULL;

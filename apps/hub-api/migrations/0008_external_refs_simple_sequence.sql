-- Reformat external refs to simple human-friendly sequence per workspace/type.
-- Format: PREFIX-0001 (fixed 4 digits).

DELETE FROM entity_external_refs;

WITH ranked AS (
  SELECT
    workspace_id,
    id AS entity_id,
    ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at ASC, id ASC) AS seq
  FROM users
  WHERE is_active = 1
)
INSERT INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'user', entity_id, 'USR-' || printf('%04d', seq), datetime('now'), datetime('now')
FROM ranked
WHERE seq <= 9999;

WITH ranked AS (
  SELECT
    workspace_id,
    id AS entity_id,
    ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at ASC, id ASC) AS seq
  FROM projects
  WHERE deleted_at IS NULL
)
INSERT INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'project', entity_id, 'PRJ-' || printf('%04d', seq), datetime('now'), datetime('now')
FROM ranked
WHERE seq <= 9999;

WITH ranked AS (
  SELECT
    p.workspace_id AS workspace_id,
    m.id AS entity_id,
    ROW_NUMBER() OVER (PARTITION BY p.workspace_id ORDER BY m.created_at ASC, m.id ASC) AS seq
  FROM milestones m
  INNER JOIN projects p ON p.id = m.project_id
)
INSERT INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'milestone', entity_id, 'MS-' || printf('%04d', seq), datetime('now'), datetime('now')
FROM ranked
WHERE seq <= 9999;

WITH ranked AS (
  SELECT
    workspace_id,
    id AS entity_id,
    ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at ASC, id ASC) AS seq
  FROM tasks
  WHERE deleted_at IS NULL
)
INSERT INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'task', entity_id, 'TSK-' || printf('%04d', seq), datetime('now'), datetime('now')
FROM ranked
WHERE seq <= 9999;

WITH ranked AS (
  SELECT
    workspace_id,
    id AS entity_id,
    ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at ASC, id ASC) AS seq
  FROM okr_cycles
  WHERE deleted_at IS NULL
)
INSERT INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'okr_cycle', entity_id, 'CYC-' || printf('%04d', seq), datetime('now'), datetime('now')
FROM ranked
WHERE seq <= 9999;

WITH ranked AS (
  SELECT
    workspace_id,
    id AS entity_id,
    ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at ASC, id ASC) AS seq
  FROM okr_objectives
  WHERE deleted_at IS NULL
)
INSERT INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'okr_objective', entity_id, 'OBJ-' || printf('%04d', seq), datetime('now'), datetime('now')
FROM ranked
WHERE seq <= 9999;

WITH ranked AS (
  SELECT
    workspace_id,
    id AS entity_id,
    ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at ASC, id ASC) AS seq
  FROM okr_key_results
  WHERE deleted_at IS NULL
)
INSERT INTO entity_external_refs (workspace_id, entity_type, entity_id, external_ref, created_at, updated_at)
SELECT workspace_id, 'okr_key_result', entity_id, 'KR-' || printf('%04d', seq), datetime('now'), datetime('now')
FROM ranked
WHERE seq <= 9999;

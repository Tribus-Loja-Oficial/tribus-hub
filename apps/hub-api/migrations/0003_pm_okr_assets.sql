-- PM milestones, project-scoped objectives/KRs, OKR↔project links, KR progress history,
-- page↔project relations, assets (metadata only; blobs stay in R2).

CREATE TABLE IF NOT EXISTS milestones (
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
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK (status IN ('pending', 'in_progress', 'completed', 'missed')),
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_milestones_project_sort ON milestones(project_id, sort_order);

CREATE TABLE IF NOT EXISTS project_objectives (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_project_objectives_project ON project_objectives(project_id);

CREATE TABLE IF NOT EXISTS project_key_results (
  id TEXT PRIMARY KEY NOT NULL,
  objective_id TEXT NOT NULL,
  title TEXT NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'number',
  start_value REAL NOT NULL DEFAULT 0,
  target_value REAL NOT NULL,
  current_value REAL NOT NULL DEFAULT 0,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  confidence INTEGER DEFAULT 50,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (objective_id) REFERENCES project_objectives(id) ON DELETE CASCADE,
  CHECK (status IN ('not_started', 'on_track', 'at_risk', 'behind', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_project_key_results_objective ON project_key_results(objective_id);

CREATE TABLE IF NOT EXISTS pm_project_okr_objective_links (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  okr_objective_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (okr_objective_id) REFERENCES okr_objectives(id) ON DELETE CASCADE,
  UNIQUE (project_id, okr_objective_id)
);

CREATE TABLE IF NOT EXISTS pm_project_okr_kr_links (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  okr_kr_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'contributes_to',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (okr_kr_id) REFERENCES okr_key_results(id) ON DELETE CASCADE,
  UNIQUE (project_id, okr_kr_id),
  CHECK (relation_type IN ('contributes_to', 'supports', 'indirect'))
);

CREATE TABLE IF NOT EXISTS okr_key_result_updates (
  id TEXT PRIMARY KEY NOT NULL,
  key_result_id TEXT NOT NULL,
  previous_value REAL NOT NULL,
  new_value REAL NOT NULL,
  comment TEXT,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (key_result_id) REFERENCES okr_key_results(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_okr_kr_updates_kr ON okr_key_result_updates(key_result_id, created_at DESC);

CREATE TABLE IF NOT EXISTS relation_links (
  id TEXT PRIMARY KEY NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation_kind TEXT NOT NULL DEFAULT 'related',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_relation_links_project ON relation_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_relation_links_project_rev ON relation_links(source_type, source_id);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'r2',
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  extension TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum_sha256 TEXT,
  width INTEGER,
  height INTEGER,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (storage_provider IN ('r2'))
);

CREATE INDEX IF NOT EXISTS idx_assets_workspace_created ON assets(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS asset_links (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  usage_kind TEXT NOT NULL DEFAULT 'attachment',
  created_at TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  CHECK (usage_kind IN ('cover', 'inline', 'attachment', 'reference', 'avatar'))
);

CREATE INDEX IF NOT EXISTS idx_asset_links_entity ON asset_links(entity_type, entity_id);

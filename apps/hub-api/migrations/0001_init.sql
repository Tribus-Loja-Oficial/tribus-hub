PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  avatar_asset_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE INDEX IF NOT EXISTS idx_users_workspace_name ON users(workspace_id, name);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  description_json TEXT,
  description_text TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  health_status TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  progress_percent REAL NOT NULL DEFAULT 0,
  owner_user_id TEXT,
  start_date TEXT,
  target_date TEXT,
  completed_at TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (status IN ('planned', 'active', 'on_hold', 'completed', 'cancelled')),
  CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CHECK (health_status IS NULL OR health_status IN ('on_track', 'at_risk', 'blocked', 'off_track'))
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_updated
  ON projects(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_slug
  ON projects(workspace_id, slug);

CREATE TABLE IF NOT EXISTS task_columns (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color_token TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_columns_workspace_sort
  ON task_columns(workspace_id, sort_order);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  milestone_id TEXT,
  column_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description_json TEXT,
  description_text TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_user_id TEXT,
  reporter_user_id TEXT,
  due_date TEXT,
  start_date TEXT,
  completed_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (column_id) REFERENCES task_columns(id),
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_column_sort
  ON tasks(workspace_id, column_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_deleted
  ON tasks(workspace_id, deleted_at);

CREATE TABLE IF NOT EXISTS task_labels (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color_token TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_labels_workspace_name
  ON task_labels(workspace_id, name);

CREATE TABLE IF NOT EXISTS task_label_links (
  task_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (task_id, label_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES task_labels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  parent_page_id TEXT,
  is_folder INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  cover_image_asset_id TEXT,
  excerpt TEXT,
  content_json TEXT,
  content_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_pages_workspace_updated
  ON pages(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_workspace_parent
  ON pages(workspace_id, parent_page_id);

CREATE TABLE IF NOT EXISTS page_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  page_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT,
  content_text TEXT,
  created_by TEXT NOT NULL,
  change_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_page_revisions_page_version
  ON page_revisions(page_id, version DESC);

CREATE TABLE IF NOT EXISTS okr_cycles (
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
  CHECK (status IN ('planned', 'active', 'closed', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_okr_cycles_workspace_status
  ON okr_cycles(workspace_id, status);

CREATE TABLE IF NOT EXISTS okr_objectives (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  cycle_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description_json TEXT,
  description_text TEXT,
  owner_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  progress_percent REAL NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  target_date TEXT,
  completed_at TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (cycle_id) REFERENCES okr_cycles(id) ON DELETE SET NULL,
  CHECK (status IN ('draft', 'on_track', 'at_risk', 'off_track', 'completed')),
  CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_okr_objectives_workspace_cycle
  ON okr_objectives(workspace_id, cycle_id);

CREATE TABLE IF NOT EXISTS okr_key_results (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  cycle_id TEXT,
  objective_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description_json TEXT,
  description_text TEXT,
  owner_user_id TEXT,
  metric_type TEXT NOT NULL DEFAULT 'number',
  unit TEXT,
  start_value REAL NOT NULL DEFAULT 0,
  current_value REAL NOT NULL DEFAULT 0,
  target_value REAL NOT NULL DEFAULT 100,
  progress_percent REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  confidence INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  target_date TEXT,
  completed_at TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (cycle_id) REFERENCES okr_cycles(id) ON DELETE SET NULL,
  FOREIGN KEY (objective_id) REFERENCES okr_objectives(id) ON DELETE CASCADE,
  CHECK (status IN ('draft', 'on_track', 'at_risk', 'off_track', 'completed')),
  CHECK (metric_type IN ('percentage', 'number', 'currency', 'boolean', 'custom'))
);

CREATE INDEX IF NOT EXISTS idx_okr_key_results_workspace_objective
  ON okr_key_results(workspace_id, objective_id);

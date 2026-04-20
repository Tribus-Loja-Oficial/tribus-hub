-- Bootstrap owner for first login after empty D1 (idempotent).
-- Credentials (change after first login): admin@tribus.com.br / changeme123!
-- Password hash: bcrypt 10 rounds, generated with bcryptjs (same as NextAuth login).

INSERT OR IGNORE INTO workspaces (id, name, slug, is_active, created_at, updated_at)
VALUES (
  'seed_ws_tribus_hub_01',
  'Tribus',
  'tribus',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO users (
  id,
  workspace_id,
  name,
  email,
  password_hash,
  role,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'seed_usr_admin_hub_01',
  'seed_ws_tribus_hub_01',
  'Admin Tribus',
  'admin@tribus.com.br',
  '$2a$10$xnMinrEBm319toNOEtQbWOpne1Y9.WIp5Wqo3Kf4xU7VH2pjvHJFu',
  'owner',
  1,
  datetime('now'),
  datetime('now')
);

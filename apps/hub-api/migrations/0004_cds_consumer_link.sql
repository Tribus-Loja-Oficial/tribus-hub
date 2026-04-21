-- Link hub D1 users to CDS consumer id (JWT `sub`). Pairs with tribus-cds 0002_seed_dev_hub_admin.sql.
-- Idempotent: safe when CI re-runs `d1 execute --file` (no ALTER ADD COLUMN — duplicate on 2nd run).
-- `consumer_id` is created on fresh DBs via 0001_init.sql; legacy DBs without the column need a one-time:
--   wrangler d1 execute tribus_hub_db --remote --command "ALTER TABLE users ADD COLUMN consumer_id TEXT;"

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_consumer_id
  ON users(consumer_id)
  WHERE consumer_id IS NOT NULL;

UPDATE users
SET consumer_id = 'hubadminseedconsumer01'
WHERE email = 'admin@tribus.com.br'
  AND (consumer_id IS NULL OR consumer_id = '');

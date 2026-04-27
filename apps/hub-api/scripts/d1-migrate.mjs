import { execSync } from "node:child_process";

const mode = process.argv.includes("--remote") ? "--remote" : "--local";
const db = "tribus_hub_db";

const migrations = [
  { id: "0001_init", file: "./migrations/0001_init.sql" },
  { id: "0002_seed_bootstrap_admin", file: "./migrations/0002_seed_bootstrap_admin.sql" },
  { id: "0003_pm_okr_assets", file: "./migrations/0003_pm_okr_assets.sql" },
  { id: "0004_cds_consumer_link", file: "./migrations/0004_cds_consumer_link.sql" },
  { id: "0005_external_refs", file: "./migrations/0005_external_refs.sql" },
  { id: "0006_remove_password_hash", file: "./migrations/0006_remove_password_hash.sql" },
  { id: "0007_drop_legacy_project_objectives_key_results", file: "./migrations/0007_drop_legacy_project_objectives_key_results.sql" },
  { id: "0008_external_refs_simple_sequence", file: "./migrations/0008_external_refs_simple_sequence.sql" },
  { id: "0009_health_snapshot_json", file: "./migrations/0009_health_snapshot_json.sql" },
  { id: "0010_okr_completed_progress_invariant", file: "./migrations/0010_okr_completed_progress_invariant.sql" },
  { id: "0011_projects_cycle_id", file: "./migrations/0011_projects_cycle_id.sql" },
];

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function queryJson(sql) {
  const cmd = `npx wrangler d1 execute ${db} ${mode} --command "${sql.replaceAll('"', '\\"')}" --json`;
  const raw = execSync(cmd, { encoding: "utf8" });
  const parsed = JSON.parse(raw);
  return parsed?.[0]?.results ?? [];
}

function scalar(sql, key) {
  const rows = queryJson(sql);
  return rows?.[0]?.[key];
}

function tableExists(name) {
  return (
    Number(
      scalar(
        `SELECT COUNT(*) AS c FROM sqlite_master WHERE type = 'table' AND name = '${name}'`,
        "c",
      ) ?? 0,
    ) > 0
  );
}

function columnExists(tableName, columnName) {
  return (
    Number(
      scalar(
        `SELECT COUNT(*) AS c FROM pragma_table_info('${tableName}') WHERE name = '${columnName}'`,
        "c",
      ) ?? 0,
    ) > 0
  );
}

run(`npx wrangler d1 execute ${db} ${mode} --file=./migrations/0000_schema_migrations.sql`);

const migrationCount = Number(
  scalar("SELECT COUNT(*) AS c FROM schema_migrations", "c") ?? 0,
);
const hasWorkspacesTable = tableExists("workspaces");
const hasExternalRefsTable = tableExists("entity_external_refs");
const hasLegacyProjectObjectives = tableExists("project_objectives");
const hasLegacyProjectKeyResults = tableExists("project_key_results");
const hasUsersPasswordHash = columnExists("users", "password_hash");

// Legacy DB bootstrap:
// if schema objects already exist but migration table is empty, mark legacy migrations as applied.
if (migrationCount === 0 && hasWorkspacesTable && hasExternalRefsTable) {
  const toMark = ["0001_init", "0002_seed_bootstrap_admin", "0003_pm_okr_assets", "0004_cds_consumer_link", "0005_external_refs"];
  if (!hasUsersPasswordHash) toMark.push("0006_remove_password_hash");
  if (!hasLegacyProjectObjectives && !hasLegacyProjectKeyResults) {
    toMark.push("0007_drop_legacy_project_objectives_key_results");
  }
  for (const id of toMark) {
    run(
      `npx wrangler d1 execute ${db} ${mode} --command "INSERT OR IGNORE INTO schema_migrations (id) VALUES ('${id}');"`,
    );
  }
}

for (const migration of migrations) {
  const alreadyApplied =
    Number(
      scalar(
        `SELECT COUNT(*) AS c FROM schema_migrations WHERE id = '${migration.id}'`,
        "c",
      ) ?? 0,
    ) > 0;
  if (alreadyApplied) continue;

  run(`npx wrangler d1 execute ${db} ${mode} --file=${migration.file}`);
  run(
    `npx wrangler d1 execute ${db} ${mode} --command "INSERT OR IGNORE INTO schema_migrations (id) VALUES ('${migration.id}');"`,
  );
}

console.log(`Done (${mode}).`);

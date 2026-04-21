type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results?: T[]; success: boolean; error?: string }>;
};

type D1DatabaseLike = { prepare: (query: string) => D1PreparedStatement };

export type ExternalRefEntityType =
  | "user"
  | "project"
  | "milestone"
  | "task"
  | "okr_cycle"
  | "okr_objective"
  | "okr_key_result";

const PREFIX_BY_ENTITY_TYPE: Record<ExternalRefEntityType, string> = {
  user: "USR",
  project: "PRJ",
  milestone: "MS",
  task: "TSK",
  okr_cycle: "CYC",
  okr_objective: "OBJ",
  okr_key_result: "KR",
};

function normalizeExternalRef(input: string): string {
  return input.trim().toUpperCase();
}

function isSimpleExternalRef(value: string, expectedPrefix: string): boolean {
  return new RegExp(`^${expectedPrefix}-\\d{4}$`).test(value);
}

async function nextSimpleExternalRef(
  db: D1DatabaseLike,
  input: { workspaceId: string; entityType: ExternalRefEntityType },
): Promise<string> {
  const prefix = PREFIX_BY_ENTITY_TYPE[input.entityType];
  const maxRes = await db
    .prepare(
      `
      SELECT MAX(CAST(SUBSTR(external_ref, LENGTH(?) + 2) AS INTEGER)) AS max_seq
      FROM entity_external_refs
      WHERE workspace_id = ?
        AND entity_type = ?
        AND external_ref LIKE (? || '-____')
    `,
    )
    .bind(prefix, input.workspaceId, input.entityType, prefix)
    .all<{ max_seq: number | null }>();
  if (!maxRes.success) throw new Error(maxRes.error ?? "Failed to generate external ref");
  const next = Number(maxRes.results?.[0]?.max_seq ?? 0) + 1;
  if (next > 9999) {
    throw new Error(
      `External ref limit reached for ${input.entityType} in this workspace (max ${prefix}-9999)`,
    );
  }
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

export async function ensureExternalRef(
  db: D1DatabaseLike,
  input: {
    workspaceId: string;
    entityType: ExternalRefEntityType;
    entityId: string;
    suggestedRef?: string | null;
  },
): Promise<string> {
  const prefix = PREFIX_BY_ENTITY_TYPE[input.entityType];
  const suggested = input.suggestedRef?.trim() ? normalizeExternalRef(input.suggestedRef) : null;
  const now = new Date().toISOString();

  const existing = await db
    .prepare(
      `
      SELECT external_ref
      FROM entity_external_refs
      WHERE workspace_id = ?
        AND entity_type = ?
        AND entity_id = ?
      LIMIT 1
    `,
    )
    .bind(input.workspaceId, input.entityType, input.entityId)
    .all<{ external_ref: string }>();
  if (!existing.success) throw new Error(existing.error ?? "Failed to query external ref");
  const current = existing.results?.[0]?.external_ref;
  if (current) return current;

  const suggestedCandidate =
    suggested && isSimpleExternalRef(suggested, prefix) ? suggested : undefined;
  let fallbackCounter = 0;
  while (fallbackCounter < 8) {
    const candidate =
      fallbackCounter === 0 && suggestedCandidate
        ? suggestedCandidate
        : await nextSimpleExternalRef(db, {
            workspaceId: input.workspaceId,
            entityType: input.entityType,
          });
    const insert = await db
      .prepare(
        `
        INSERT OR IGNORE INTO entity_external_refs (
          workspace_id, entity_type, entity_id, external_ref, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .bind(input.workspaceId, input.entityType, input.entityId, candidate, now, now)
      .all();
    if (!insert.success) throw new Error(insert.error ?? "Failed to create external ref");

    const row = await db
      .prepare(
        `
        SELECT external_ref
        FROM entity_external_refs
        WHERE workspace_id = ?
          AND entity_type = ?
          AND entity_id = ?
        LIMIT 1
      `,
      )
      .bind(input.workspaceId, input.entityType, input.entityId)
      .all<{ external_ref: string }>();
    if (!row.success) throw new Error(row.error ?? "Failed to load external ref");
    const created = row.results?.[0]?.external_ref;
    if (created) return created;
    fallbackCounter += 1;
  }

  throw new Error("Failed to create external ref after retries");
}

export async function resolveEntityIdByExternalRef(
  db: D1DatabaseLike,
  input: {
    workspaceId: string;
    entityType: ExternalRefEntityType;
    externalRef: string;
  },
): Promise<string | null> {
  const result = await db
    .prepare(
      `
      SELECT entity_id
      FROM entity_external_refs
      WHERE workspace_id = ?
        AND entity_type = ?
        AND external_ref = ?
      LIMIT 1
    `,
    )
    .bind(input.workspaceId, input.entityType, normalizeExternalRef(input.externalRef))
    .all<{ entity_id: string }>();
  if (!result.success) throw new Error(result.error ?? "Failed to resolve external ref");
  return result.results?.[0]?.entity_id ?? null;
}

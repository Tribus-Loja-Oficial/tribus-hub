import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  json,
  date,
  index,
  integer,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/utils/ids";
import { workspaces } from "./workspaces";
import { users } from "./users";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const okrCycleStatusEnum = pgEnum("okr_cycle_status", [
  "planned",
  "active",
  "closed",
  "archived",
]);

export const okrObjectiveStatusEnum = pgEnum("okr_objective_status", [
  "draft",
  "on_track",
  "at_risk",
  "off_track",
  "completed",
]);

export const okrKeyResultStatusEnum = pgEnum("okr_key_result_status", [
  "draft",
  "on_track",
  "at_risk",
  "off_track",
  "completed",
]);

export const okrMetricTypeEnum = pgEnum("okr_metric_type", [
  "percentage",
  "number",
  "currency",
  "boolean",
  "custom",
]);

export const okrPriorityEnum = pgEnum("okr_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

// ─── okr_cycles ─────────────────────────────────────────────────────────────

export const okrCycles = pgTable(
  "okr_cycles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: okrCycleStatusEnum("status").notNull().default("planned"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    workspaceIdx: index("okr_cycles_workspace_idx").on(t.workspaceId),
    statusIdx: index("okr_cycles_status_idx").on(t.status),
  }),
);

// ─── okr_groups ─────────────────────────────────────────────────────────────

export const okrGroups = pgTable(
  "okr_groups",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    colorToken: text("color_token"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index("okr_groups_workspace_idx").on(t.workspaceId),
  }),
);

// ─── okr_objectives ─────────────────────────────────────────────────────────

export const okrObjectives = pgTable(
  "okr_objectives",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    cycleId: text("cycle_id").references(() => okrCycles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    descriptionJson: json("description_json"),
    descriptionText: text("description_text"),
    ownerUserId: text("owner_user_id").references(() => users.id),
    status: okrObjectiveStatusEnum("status").notNull().default("draft"),
    progressPercent: doublePrecision("progress_percent").notNull().default(0),
    priority: okrPriorityEnum("priority").notNull().default("medium"),
    sortOrder: integer("sort_order").notNull().default(0),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    workspaceIdx: index("okr_objectives_workspace_idx").on(t.workspaceId),
    cycleIdx: index("okr_objectives_cycle_idx").on(t.cycleId),
    statusIdx: index("okr_objectives_status_idx").on(t.status),
  }),
);

// ─── okr_objective_groups (join table) ───────────────────────────────────────

export const okrObjectiveGroups = pgTable("okr_objective_groups", {
  objectiveId: text("objective_id")
    .notNull()
    .references(() => okrObjectives.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => okrGroups.id, { onDelete: "cascade" }),
});

// ─── okr_key_results ────────────────────────────────────────────────────────

export const okrKeyResults = pgTable(
  "okr_key_results",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    cycleId: text("cycle_id").references(() => okrCycles.id, { onDelete: "set null" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => okrObjectives.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    descriptionJson: json("description_json"),
    descriptionText: text("description_text"),
    ownerUserId: text("owner_user_id").references(() => users.id),
    metricType: okrMetricTypeEnum("metric_type").notNull().default("number"),
    unit: text("unit"),
    startValue: doublePrecision("start_value").notNull().default(0),
    currentValue: doublePrecision("current_value").notNull().default(0),
    targetValue: doublePrecision("target_value").notNull().default(100),
    progressPercent: doublePrecision("progress_percent").notNull().default(0),
    status: okrKeyResultStatusEnum("status").notNull().default("draft"),
    confidence: integer("confidence").default(50),
    sortOrder: integer("sort_order").notNull().default(0),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    workspaceIdx: index("okr_key_results_workspace_idx").on(t.workspaceId),
    objectiveIdx: index("okr_key_results_objective_idx").on(t.objectiveId),
    cycleIdx: index("okr_key_results_cycle_idx").on(t.cycleId),
    statusIdx: index("okr_key_results_status_idx").on(t.status),
  }),
);

// ─── okr_key_result_updates ─────────────────────────────────────────────────

export const okrKeyResultUpdates = pgTable(
  "okr_key_result_updates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    keyResultId: text("key_result_id")
      .notNull()
      .references(() => okrKeyResults.id, { onDelete: "cascade" }),
    previousValue: doublePrecision("previous_value").notNull(),
    newValue: doublePrecision("new_value").notNull(),
    comment: text("comment"),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    keyResultIdx: index("okr_kr_updates_key_result_idx").on(t.keyResultId),
  }),
);

// ─── Inferred types ──────────────────────────────────────────────────────────

export type OkrCycle = typeof okrCycles.$inferSelect;
export type NewOkrCycle = typeof okrCycles.$inferInsert;
export type OkrObjective = typeof okrObjectives.$inferSelect;
export type NewOkrObjective = typeof okrObjectives.$inferInsert;
export type OkrKeyResult = typeof okrKeyResults.$inferSelect;
export type NewOkrKeyResult = typeof okrKeyResults.$inferInsert;
export type OkrKeyResultUpdate = typeof okrKeyResultUpdates.$inferSelect;
export type NewOkrKeyResultUpdate = typeof okrKeyResultUpdates.$inferInsert;
export type OkrGroup = typeof okrGroups.$inferSelect;
export type NewOkrGroup = typeof okrGroups.$inferInsert;

export type OkrCycleStatus = (typeof okrCycleStatusEnum.enumValues)[number];
export type OkrObjectiveStatus = (typeof okrObjectiveStatusEnum.enumValues)[number];
export type OkrKeyResultStatus = (typeof okrKeyResultStatusEnum.enumValues)[number];
export type OkrMetricType = (typeof okrMetricTypeEnum.enumValues)[number];
export type OkrPriority = (typeof okrPriorityEnum.enumValues)[number];

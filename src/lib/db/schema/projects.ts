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
import { okrObjectives, okrKeyResults } from "./okr";

export const projectStatusEnum = pgEnum("project_status", [
  "planned",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const projectPriorityEnum = pgEnum("project_priority", ["low", "medium", "high", "urgent"]);

export const objectiveStatusEnum = pgEnum("objective_status", [
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
]);

export const keyResultStatusEnum = pgEnum("key_result_status", [
  "not_started",
  "on_track",
  "at_risk",
  "behind",
  "completed",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "in_progress",
  "completed",
  "missed",
]);

export const projectHealthStatusEnum = pgEnum("project_health_status", [
  "on_track",
  "at_risk",
  "blocked",
  "off_track",
]);

export const okrLinkRelationTypeEnum = pgEnum("okr_link_relation_type", [
  "contributes_to",
  "supports",
  "indirect",
]);

export const projects = pgTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    descriptionJson: json("description_json"),
    descriptionText: text("description_text"),
    status: projectStatusEnum("status").notNull().default("planned"),
    healthStatus: projectHealthStatusEnum("health_status"),
    priority: projectPriorityEnum("priority").notNull().default("medium"),
    progressPercent: doublePrecision("progress_percent").notNull().default(0),
    ownerUserId: text("owner_user_id").references(() => users.id),
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
  (table) => ({
    workspaceIdx: index("projects_workspace_id_idx").on(table.workspaceId),
    slugIdx: index("projects_slug_idx").on(table.slug),
    titleIdx: index("projects_title_idx").on(table.title),
  }),
);

export const objectives = pgTable("objectives", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ownerUserId: text("owner_user_id").references(() => users.id),
  status: objectiveStatusEnum("status").notNull().default("not_started"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const keyResults = pgTable("key_results", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  objectiveId: text("objective_id")
    .notNull()
    .references(() => objectives.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  metricType: text("metric_type").notNull().default("number"),
  startValue: integer("start_value").notNull().default(0),
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").notNull().default(0),
  unit: text("unit"),
  status: keyResultStatusEnum("status").notNull().default("not_started"),
  confidence: integer("confidence").default(50),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: milestoneStatusEnum("status").notNull().default("pending"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ownerUserId: text("owner_user_id").references(() => users.id),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pmProjectOkrObjectiveLinks = pgTable(
  "pm_project_okr_objective_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    okrObjectiveId: text("okr_objective_id")
      .notNull()
      .references(() => okrObjectives.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("pm_proj_okr_obj_project_idx").on(t.projectId),
  }),
);

export const pmProjectOkrKrLinks = pgTable(
  "pm_project_okr_kr_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    okrKrId: text("okr_kr_id")
      .notNull()
      .references(() => okrKeyResults.id, { onDelete: "cascade" }),
    relationType: okrLinkRelationTypeEnum("relation_type").notNull().default("contributes_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("pm_proj_okr_kr_project_idx").on(t.projectId),
  }),
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Objective = typeof objectives.$inferSelect;
export type NewObjective = typeof objectives.$inferInsert;
export type KeyResult = typeof keyResults.$inferSelect;
export type NewKeyResult = typeof keyResults.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type ProjectPriority = (typeof projectPriorityEnum.enumValues)[number];
export type ProjectHealthStatus = (typeof projectHealthStatusEnum.enumValues)[number];
export type MilestoneStatus = (typeof milestoneStatusEnum.enumValues)[number];
export type PmProjectOkrObjectiveLink = typeof pmProjectOkrObjectiveLinks.$inferSelect;
export type PmProjectOkrKrLink = typeof pmProjectOkrKrLinks.$inferSelect;

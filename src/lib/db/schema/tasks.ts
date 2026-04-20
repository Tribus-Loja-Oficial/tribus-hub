import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  json,
  date,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/utils/ids";
import { workspaces } from "./workspaces";
import { users } from "./users";
import { projects } from "./projects";
import { milestones } from "./projects";

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const taskColumns = pgTable("task_columns", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  colorToken: text("color_token"),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    milestoneId: text("milestone_id").references(() => milestones.id, {
      onDelete: "set null",
    }),
    columnId: text("column_id")
      .notNull()
      .references(() => taskColumns.id),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    descriptionJson: json("description_json"),
    descriptionText: text("description_text"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    assigneeUserId: text("assignee_user_id").references(() => users.id),
    reporterUserId: text("reporter_user_id").references(() => users.id),
    dueDate: date("due_date"),
    startDate: date("start_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
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
    workspaceIdx: index("tasks_workspace_id_idx").on(table.workspaceId),
    columnIdx: index("tasks_column_id_idx").on(table.columnId),
    projectIdx: index("tasks_project_id_idx").on(table.projectId),
    titleIdx: index("tasks_title_idx").on(table.title),
  }),
);

export const taskLabels = pgTable("task_labels", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  colorToken: text("color_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskLabelLinks = pgTable("task_label_links", {
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  labelId: text("label_id")
    .notNull()
    .references(() => taskLabels.id, { onDelete: "cascade" }),
});

export type TaskColumn = typeof taskColumns.$inferSelect;
export type NewTaskColumn = typeof taskColumns.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskLabel = typeof taskLabels.$inferSelect;
export type NewTaskLabel = typeof taskLabels.$inferInsert;
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];

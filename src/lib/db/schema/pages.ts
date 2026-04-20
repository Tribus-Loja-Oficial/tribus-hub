import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  json,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/utils/ids";
import { workspaces } from "./workspaces";
import { users } from "./users";

export const pageStatusEnum = pgEnum("page_status", ["draft", "published", "archived"]);

export const pages = pgTable(
  "pages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    parentPageId: text("parent_page_id"),
    /** Folder nodes group pages in the tree; they use the same `pages` row type. */
    isFolder: boolean("is_folder").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    icon: text("icon"),
    coverImageAssetId: text("cover_image_asset_id"),
    excerpt: text("excerpt"),
    contentJson: json("content_json"),
    contentText: text("content_text"),
    status: pageStatusEnum("status").notNull().default("draft"),
    isDeleted: boolean("is_deleted").notNull().default(false),
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
    workspaceIdx: index("pages_workspace_id_idx").on(table.workspaceId),
    parentPageIdx: index("pages_parent_page_id_idx").on(table.parentPageId),
    slugIdx: index("pages_slug_idx").on(table.slug),
    titleIdx: index("pages_title_idx").on(table.title),
  }),
);

export const pageRevisions = pgTable("page_revisions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  pageId: text("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  contentJson: json("content_json"),
  contentText: text("content_text"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pageTags = pgTable("page_tags", {
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

export const pageTagLinks = pgTable("page_tag_links", {
  pageId: text("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => pageTags.id, { onDelete: "cascade" }),
});

export const relationLinks = pgTable("relation_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  relationKind: text("relation_kind").notNull().default("related"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type PageRevision = typeof pageRevisions.$inferSelect;
export type NewPageRevision = typeof pageRevisions.$inferInsert;
export type PageTag = typeof pageTags.$inferSelect;
export type PageTagLink = typeof pageTagLinks.$inferSelect;
export type RelationLink = typeof relationLinks.$inferSelect;
export type PageStatus = (typeof pageStatusEnum.enumValues)[number];

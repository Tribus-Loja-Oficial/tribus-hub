import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@/lib/utils/ids";
import { workspaces } from "./workspaces";
import { users } from "./users";

export const storageProviderEnum = pgEnum("storage_provider", ["r2"]);
export const assetUsageKindEnum = pgEnum("asset_usage_kind", [
  "cover",
  "inline",
  "attachment",
  "reference",
  "avatar",
]);

export const assets = pgTable("assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  storageProvider: storageProviderEnum("storage_provider").notNull().default("r2"),
  bucket: text("bucket").notNull(),
  objectKey: text("object_key").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  extension: text("extension").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  checksumSha256: text("checksum_sha256"),
  width: integer("width"),
  height: integer("height"),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assetLinks = pgTable("asset_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // 'page' | 'project' | 'task' | 'milestone'
  entityId: text("entity_id").notNull(),
  usageKind: assetUsageKindEnum("usage_kind").notNull().default("attachment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetLink = typeof assetLinks.$inferSelect;
export type NewAssetLink = typeof assetLinks.$inferInsert;

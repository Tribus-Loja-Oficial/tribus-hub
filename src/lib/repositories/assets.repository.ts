// @ts-nocheck
import { db } from "@/lib/db/client";
import { assets, assetLinks } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { Asset, AssetLink, NewAsset, NewAssetLink } from "@/lib/db/schema";

export async function findAssetById(id: string): Promise<Asset | undefined> {
  return db.query.assets.findFirst({ where: eq(assets.id, id) });
}

export async function findAssetsByWorkspace(workspaceId: string): Promise<Asset[]> {
  return db.query.assets.findMany({
    where: eq(assets.workspaceId, workspaceId),
    orderBy: [desc(assets.createdAt)],
  });
}

export async function createAsset(data: NewAsset): Promise<Asset> {
  const [asset] = await db.insert(assets).values(data).returning();
  if (!asset) throw new Error("Failed to create asset");
  return asset;
}

export async function deleteAsset(id: string): Promise<void> {
  await db.delete(assets).where(eq(assets.id, id));
}

export async function createAssetLink(data: NewAssetLink): Promise<AssetLink> {
  const [link] = await db.insert(assetLinks).values(data).returning();
  if (!link) throw new Error("Failed to create asset link");
  return link;
}

export async function findAssetLinksByEntity(
  entityType: string,
  entityId: string,
): Promise<AssetLink[]> {
  return db.query.assetLinks.findMany({
    where: and(eq(assetLinks.entityType, entityType), eq(assetLinks.entityId, entityId)),
  });
}

export async function deleteAssetLinks(assetId: string): Promise<void> {
  await db.delete(assetLinks).where(eq(assetLinks.assetId, assetId));
}

export async function findAssetsForEntity(
  workspaceId: string,
  entityType: string,
  entityId: string,
): Promise<Array<{ asset: Asset; usageKind: (typeof assetLinks.$inferSelect)["usageKind"] }>> {
  const links = await findAssetLinksByEntity(entityType, entityId);
  if (links.length === 0) return [];
  const assetIds = [...new Set(links.map((l) => l.assetId))];
  const rows = await db.query.assets.findMany({
    where: and(inArray(assets.id, assetIds), eq(assets.workspaceId, workspaceId)),
    orderBy: [desc(assets.createdAt)],
  });
  return rows.map((asset) => ({
    asset,
    usageKind: links.find((l) => l.assetId === asset.id)?.usageKind ?? "attachment",
  }));
}

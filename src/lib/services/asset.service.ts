import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import {
  uploadToR2,
  deleteFromR2,
  getSignedDownloadUrl,
  getPublicUrl,
} from "@/lib/integrations/r2/r2.service";
import { isR2Configured } from "@/lib/integrations/r2/r2.client";
import { recordAudit } from "./audit.service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { appConfig } from "@/lib/config/app-config";
import type { AuthenticatedUser } from "@/lib/permissions";
import type { Asset, AssetLink } from "@/lib/db/schema";
import sizeOf from "image-size";

export interface UploadAssetInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
}

export interface AssetWithUrl extends Asset {
  url: string;
}

type HubAsset = {
  id: string;
  workspaceId: string;
  storageProvider: string;
  bucket: string;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  checksumSha256: string | null;
  width: number | null;
  height: number | null;
  uploadedBy: string;
  createdAt: string;
};

function asAsset(row: HubAsset): Asset {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    storageProvider: row.storageProvider as Asset["storageProvider"],
    bucket: row.bucket,
    objectKey: row.objectKey,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    extension: row.extension,
    sizeBytes: row.sizeBytes,
    checksumSha256: row.checksumSha256,
    width: row.width,
    height: row.height,
    uploadedBy: row.uploadedBy,
    createdAt: new Date(row.createdAt),
  };
}

export async function uploadAsset(
  user: AuthenticatedUser,
  input: UploadAssetInput,
): Promise<AssetWithUrl> {
  if (!isR2Configured()) {
    throw new ValidationError(
      "Upload não disponível: credenciais R2 não configuradas. Adicione R2_ACCOUNT_ID, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY ao .env.local.",
    );
  }

  if (!appConfig.upload.allowedMimeTypes.includes(input.mimeType)) {
    throw new ValidationError(`MIME type "${input.mimeType}" is not allowed`);
  }

  if (input.buffer.length > appConfig.upload.maxSizeBytes) {
    throw new ValidationError(
      `File exceeds maximum size of ${appConfig.upload.maxSizeBytes} bytes`,
    );
  }

  const ext = input.originalFilename.split(".").pop()?.toLowerCase() ?? "bin";
  const r2Result = await uploadToR2(input.buffer, input.originalFilename, input.mimeType);

  let width: number | undefined;
  let height: number | undefined;
  if (input.mimeType.startsWith("image/")) {
    try {
      const dimensions = sizeOf(input.buffer);
      width = dimensions.width;
      height = dimensions.height;
    } catch {
      // ignore
    }
  }

  const row = await hubApiFetch<HubAsset>({
    method: "POST",
    path: "/v1/assets",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      bucket: r2Result.bucket,
      objectKey: r2Result.objectKey,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      extension: ext,
      sizeBytes: r2Result.sizeBytes,
      checksumSha256: r2Result.checksumSha256,
      width: width ?? null,
      height: height ?? null,
    },
  });

  const asset = asAsset(row);

  await recordAudit({
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    entityType: "asset",
    entityId: asset.id,
    action: "asset.uploaded",
    metadata: { filename: input.originalFilename, size: r2Result.sizeBytes },
  });

  const url = getPublicUrl(asset.objectKey) ?? (await getSignedDownloadUrl(asset.objectKey));
  return { ...asset, url };
}

export async function getAsset(user: AuthenticatedUser, id: string): Promise<AssetWithUrl> {
  const row = await hubApiFetch<HubAsset>({
    path: `/v1/assets/${id}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  }).catch(() => null);
  if (!row || row.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Asset", id);
  }
  const asset = asAsset(row);
  const url = getPublicUrl(asset.objectKey) ?? (await getSignedDownloadUrl(asset.objectKey));
  return { ...asset, url };
}

export async function listAssets(user: AuthenticatedUser): Promise<AssetWithUrl[]> {
  const list = await hubApiFetch<HubAsset[]>({
    path: "/v1/assets",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
  return Promise.all(
    list.map(async (row) => {
      const asset = asAsset(row);
      const url = getPublicUrl(asset.objectKey) ?? (await getSignedDownloadUrl(asset.objectKey));
      return { ...asset, url };
    }),
  );
}

export async function deleteAsset(user: AuthenticatedUser, id: string): Promise<void> {
  const row = await hubApiFetch<HubAsset>({
    path: `/v1/assets/${id}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  }).catch(() => null);
  if (!row || row.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Asset", id);
  }

  await deleteFromR2(row.objectKey);
  await hubApiFetch({
    method: "DELETE",
    path: `/v1/assets/${id}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });

  await recordAudit({
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    entityType: "asset",
    entityId: id,
    action: "asset.deleted",
  });
}

export async function linkAsset(
  user: AuthenticatedUser,
  assetId: string,
  entityType: string,
  entityId: string,
  usageKind: AssetLink["usageKind"],
): Promise<AssetLink> {
  const row = await hubApiFetch<HubAsset>({
    path: `/v1/assets/${assetId}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  }).catch(() => null);
  if (!row || row.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Asset", assetId);
  }

  const link = await hubApiFetch<{
    id: string;
    assetId: string;
    entityType: string;
    entityId: string;
    usageKind: string;
    createdAt: string;
  }>({
    method: "POST",
    path: `/v1/assets/${assetId}/link`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: { entityType, entityId, usageKind },
  });

  return {
    id: link.id,
    assetId: link.assetId,
    entityType: link.entityType,
    entityId: link.entityId,
    usageKind: link.usageKind as AssetLink["usageKind"],
    createdAt: new Date(link.createdAt),
  };
}

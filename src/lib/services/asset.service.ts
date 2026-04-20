import * as assetsRepo from "@/lib/repositories/assets.repository";
import { uploadToR2, deleteFromR2, getSignedDownloadUrl, getPublicUrl } from "@/lib/integrations/r2/r2.service";
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

export async function uploadAsset(
  user: AuthenticatedUser,
  input: UploadAssetInput,
): Promise<AssetWithUrl> {
  if (!isR2Configured()) {
    throw new ValidationError(
      "Upload não disponível: credenciais R2 não configuradas. Adicione R2_ACCOUNT_ID, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY ao .env.local.",
    );
  }

  // Validate mime type
  if (!appConfig.upload.allowedMimeTypes.includes(input.mimeType)) {
    throw new ValidationError(`MIME type "${input.mimeType}" is not allowed`);
  }

  // Validate size
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
      // Not critical
    }
  }

  const asset = await assetsRepo.createAsset({
    workspaceId: user.workspaceId,
    storageProvider: "r2",
    bucket: r2Result.bucket,
    objectKey: r2Result.objectKey,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    extension: ext,
    sizeBytes: r2Result.sizeBytes,
    checksumSha256: r2Result.checksumSha256,
    width: width ?? null,
    height: height ?? null,
    uploadedBy: user.id,
  });

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

export async function getAsset(
  user: AuthenticatedUser,
  id: string,
): Promise<AssetWithUrl> {
  const asset = await assetsRepo.findAssetById(id);
  if (!asset || asset.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Asset", id);
  }

  const url = getPublicUrl(asset.objectKey) ?? (await getSignedDownloadUrl(asset.objectKey));
  return { ...asset, url };
}

export async function listAssets(user: AuthenticatedUser): Promise<AssetWithUrl[]> {
  const list = await assetsRepo.findAssetsByWorkspace(user.workspaceId);
  return Promise.all(
    list.map(async (asset) => {
      const url =
        getPublicUrl(asset.objectKey) ?? (await getSignedDownloadUrl(asset.objectKey));
      return { ...asset, url };
    }),
  );
}

export async function deleteAsset(user: AuthenticatedUser, id: string): Promise<void> {
  const asset = await assetsRepo.findAssetById(id);
  if (!asset || asset.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Asset", id);
  }

  await deleteFromR2(asset.objectKey);
  await assetsRepo.deleteAssetLinks(id);
  await assetsRepo.deleteAsset(id);

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
  const asset = await assetsRepo.findAssetById(assetId);
  if (!asset || asset.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Asset", assetId);
  }

  return assetsRepo.createAssetLink({ assetId, entityType, entityId, usageKind });
}

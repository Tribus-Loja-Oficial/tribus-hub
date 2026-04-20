import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "./r2.client";
import { env } from "@/lib/config/env";
import { createHash } from "crypto";
import { createId } from "@/lib/utils/ids";

export interface UploadResult {
  objectKey: string;
  bucket: string;
  checksumSha256: string;
  sizeBytes: number;
}

export async function uploadToR2(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
): Promise<UploadResult> {
  const ext = originalFilename.split(".").pop()?.toLowerCase() ?? "bin";
  const objectKey = `uploads/${new Date().getFullYear()}/${createId()}.${ext}`;
  const bucket = env.R2_BUCKET_NAME;

  const checksum = createHash("sha256").update(buffer).digest("hex");

  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
      Metadata: {
        "original-filename": encodeURIComponent(originalFilename),
        "checksum-sha256": checksum,
      },
    }),
  );

  return {
    objectKey,
    bucket,
    checksumSha256: checksum,
    sizeBytes: buffer.length,
  };
}

export async function deleteFromR2(objectKey: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey,
    }),
  );
}

export async function getSignedDownloadUrl(
  objectKey: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: objectKey,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export function getPublicUrl(objectKey: string): string | null {
  if (!env.R2_PUBLIC_URL) return null;
  return `${env.R2_PUBLIC_URL}/${objectKey}`;
}

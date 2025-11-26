import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, s3PublicClient, S3_BUCKET, S3_PUBLIC_ENDPOINT } from './s3-client';

/**
 * Generate a presigned URL for uploading a file directly to S3/MinIO
 * Uses public client so signature matches when accessed via proxy
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3PublicClient, command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading a file from S3/MinIO
 * Uses public client so signature matches when accessed via proxy
 */
export async function getDownloadUrl(
  key: string,
  expiresIn = 3600,
  filename?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ...(filename && {
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
  });

  return getSignedUrl(s3PublicClient, command, { expiresIn });
}

/**
 * Generate a public URL for a file (requires public bucket policy)
 */
export function getPublicUrl(key: string): string {
  return `${S3_PUBLIC_ENDPOINT}/${S3_BUCKET}/${key}`;
}

/**
 * Delete a file from S3/MinIO (uses internal client)
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Delete multiple files from S3/MinIO
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteFile(key)));
}

/**
 * List all objects in the bucket with optional prefix
 */
export async function listObjects(prefix?: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      keys.push(...response.Contents.map((obj) => obj.Key!).filter(Boolean));
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

/**
 * Check if a file exists in S3/MinIO
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata from S3/MinIO
 */
export async function getFileMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
    };
  } catch {
    return null;
  }
}

/**
 * Generate S3 key for a release file
 */
export function generateS3Key(
  channel: string,
  platform: string,
  version: string,
  filename: string
): string {
  return `${channel}/${platform}/${version}/${filename}`;
}

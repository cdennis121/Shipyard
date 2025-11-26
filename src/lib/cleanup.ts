import prisma from '@/lib/db';
import { listObjects, deleteFile } from '@/lib/s3-operations';

export interface CleanupResult {
  orphanedFiles: string[];
  deletedFiles: string[];
  errors: string[];
}

/**
 * Find and optionally delete orphaned files in S3 that don't have
 * corresponding records in the database
 */
export async function cleanupOrphanedFiles(
  dryRun = false
): Promise<CleanupResult> {
  const result: CleanupResult = {
    orphanedFiles: [],
    deletedFiles: [],
    errors: [],
  };

  try {
    // Get all S3 keys from the bucket
    const s3Keys = await listObjects();

    // Get all S3 keys from the database
    const dbFiles = await prisma.releaseFile.findMany({
      select: { s3Key: true },
    });
    const dbKeys = new Set(dbFiles.map((f) => f.s3Key));

    // Find orphaned files (in S3 but not in DB)
    const orphanedKeys = s3Keys.filter((key) => !dbKeys.has(key));
    result.orphanedFiles = orphanedKeys;

    if (!dryRun && orphanedKeys.length > 0) {
      // Delete orphaned files
      for (const key of orphanedKeys) {
        try {
          await deleteFile(key);
          result.deletedFiles.push(key);
        } catch (error) {
          result.errors.push(`Failed to delete ${key}: ${error}`);
        }
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`Cleanup error: ${error}`);
    return result;
  }
}

/**
 * Delete all S3 files associated with a release
 */
export async function deleteReleaseFiles(releaseId: string): Promise<void> {
  const files = await prisma.releaseFile.findMany({
    where: { releaseId },
    select: { s3Key: true },
  });

  for (const file of files) {
    try {
      await deleteFile(file.s3Key);
    } catch (error) {
      console.error(`Failed to delete S3 file ${file.s3Key}:`, error);
    }
  }
}

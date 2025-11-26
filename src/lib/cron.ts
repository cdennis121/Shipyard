import cron from 'node-cron';
import { cleanupOrphanedFiles } from './cleanup';

let isScheduled = false;

/**
 * Initialize the cleanup cron job
 * Runs daily at 2 AM
 */
export function initCleanupCron(): void {
  if (isScheduled) {
    return;
  }

  // Run cleanup at 2 AM every day
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Starting scheduled cleanup...');
    
    try {
      const result = await cleanupOrphanedFiles(false);
      
      console.log('[Cron] Cleanup completed:', {
        orphanedFiles: result.orphanedFiles.length,
        deletedFiles: result.deletedFiles.length,
        errors: result.errors.length,
      });

      if (result.errors.length > 0) {
        console.error('[Cron] Cleanup errors:', result.errors);
      }
    } catch (error) {
      console.error('[Cron] Cleanup failed:', error);
    }
  });

  isScheduled = true;
  console.log('[Cron] Cleanup job scheduled for 2 AM daily');
}

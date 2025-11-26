export async function register() {
  // Only run on the server side in production
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to avoid Edge runtime issues
    const { initCleanupCron } = await import('@/lib/cron');
    // Initialize cron jobs
    initCleanupCron();
  }
}

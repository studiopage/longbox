export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables at startup
    await import('@/lib/env');

    const { initWatcher } = await import('@/lib/scanner/watcher');
    await initWatcher();
  }
}


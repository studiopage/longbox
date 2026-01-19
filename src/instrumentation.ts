export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initWatcher } = await import('@/lib/scanner/watcher');
    await initWatcher();
  }
}


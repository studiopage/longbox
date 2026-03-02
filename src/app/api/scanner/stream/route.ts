import { scannerProgress } from '@/lib/scanner/progress-emitter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Server-Sent Events (SSE) endpoint for real-time scanner progress
 *
 * Usage from client:
 *   const eventSource = new EventSource('/api/scanner/stream');
 *   eventSource.onmessage = (event) => {
 *     const progress = JSON.parse(event.data);
 *     console.log(progress);
 *   };
 */
export async function GET() {
  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const currentProgress = scannerProgress.getCurrentProgress();
      if (currentProgress) {
        const data = `data: ${JSON.stringify(currentProgress)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // Listen for progress updates
      const progressListener = (progress: any) => {
        const data = `data: ${JSON.stringify(progress)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      scannerProgress.on('progress', progressListener);

      // Send keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 30000);

      // Cleanup function
      const cleanup = () => {
        scannerProgress.off('progress', progressListener);
        clearInterval(keepAlive);
      };

      // Handle client disconnect
      const checkClosed = setInterval(() => {
        // Stream will be closed when client disconnects
        try {
          controller.enqueue(encoder.encode(''));
        } catch {
          cleanup();
          clearInterval(checkClosed);
          controller.close();
        }
      }, 5000);

      // Store cleanup for potential future use
      (controller as any)._cleanup = cleanup;
    },

    cancel() {
      // Called when client closes connection
      if ((this as any)._cleanup) {
        (this as any)._cleanup();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * Scanner Progress Emitter
 *
 * Emits real-time progress events during scanning operations.
 * Uses EventEmitter pattern for in-memory pub/sub.
 */

import { EventEmitter } from 'events';

export interface ScanProgress {
  status: 'started' | 'processing' | 'completed' | 'error';
  currentFile?: string;
  processed: number;
  total: number;
  added: number;
  queued: number;
  errors: number;
  message?: string;
  error?: string;
}

class ScannerProgressEmitter extends EventEmitter {
  private currentScan: ScanProgress | null = null;

  startScan(total: number) {
    this.currentScan = {
      status: 'started',
      processed: 0,
      total,
      added: 0,
      queued: 0,
      errors: 0,
      message: `Starting scan of ${total} files...`
    };
    this.emit('progress', this.currentScan);
  }

  updateProgress(update: Partial<ScanProgress>) {
    if (!this.currentScan) return;

    this.currentScan = {
      ...this.currentScan,
      ...update,
      status: update.status || 'processing'
    };
    this.emit('progress', this.currentScan);
  }

  completeScan(stats: { added: number; queued: number; errors: number; time: string }) {
    if (!this.currentScan) return;

    this.currentScan = {
      ...this.currentScan,
      status: 'completed',
      message: `Scan complete in ${stats.time}s. Added: ${stats.added}, Queued: ${stats.queued}, Errors: ${stats.errors}`
    };
    this.emit('progress', this.currentScan);

    // Clear after 5 seconds
    setTimeout(() => {
      this.currentScan = null;
    }, 5000);
  }

  errorScan(error: string) {
    if (!this.currentScan) return;

    this.currentScan = {
      ...this.currentScan,
      status: 'error',
      error,
      message: `Scan failed: ${error}`
    };
    this.emit('progress', this.currentScan);
  }

  getCurrentProgress(): ScanProgress | null {
    return this.currentScan;
  }

  isScanning(): boolean {
    return this.currentScan !== null &&
           (this.currentScan.status === 'started' || this.currentScan.status === 'processing');
  }
}

// Singleton instance
export const scannerProgress = new ScannerProgressEmitter();

'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScanStatus {
  id?: string;
  status: string;
  started_at?: string;
  completed_at?: string | null;
  total_files?: number;
  processed_files?: number;
  matched?: number;
  needs_review?: number;
  errors?: number;
  current_file?: string | null;
  hasRun?: boolean;
}

export function useScanStatus(pollInterval = 3000) {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/scanner/status');
      if (res.ok) {
        const data: ScanStatus = await res.json();
        setStatus(data);
        setIsPolling(data.status === 'running');
      }
    } catch {
      // Silently ignore fetch errors
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll when scan is active
  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [isPolling, pollInterval, fetchStatus]);

  return {
    status,
    isScanning: status?.status === 'running',
    refresh: fetchStatus,
  };
}

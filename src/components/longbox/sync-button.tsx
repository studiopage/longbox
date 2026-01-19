'use client'

import { syncLibrary } from '@/actions/sync';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setIsSyncing(true);
    const res = await syncLibrary();
    if (res.success) {
      alert(`Sync Complete! Imported ${res.count} series.`);
      router.refresh();
    } else {
      alert('Sync Failed. Check console.');
    }
    setIsSyncing(false);
  }

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Syncing...' : 'Sync Library'}
    </Button>
  );
}

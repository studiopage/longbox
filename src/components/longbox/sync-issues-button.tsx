'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { forceSyncIssuesAction } from '@/actions/requests';
import { useRouter } from 'next/navigation';

export function SyncIssuesButton({ seriesId, cvId }: { seriesId: string, cvId: string | null }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!cvId) {
    return (
      <Button variant="outline" size="sm" disabled>
        <RefreshCw className="w-4 h-4 mr-2" />
        Sync Metadata
      </Button>
    );
  }

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await forceSyncIssuesAction(seriesId, cvId);
      if (result.success) {
        alert(`Synced ${result.count} issues!`);
        router.refresh();
      } else {
        alert(result.message || "Sync failed.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to sync issues.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      disabled={loading}
      onClick={handleSync}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      Sync Metadata
    </Button>
  );
}


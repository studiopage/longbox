'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, DownloadCloud } from 'lucide-react';
import { requestAllMissingAction } from '@/actions/requests';
import { useRouter } from 'next/navigation';

export function RequestAllButton({ seriesId }: { seriesId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleBatch = async () => {
    setLoading(true);
    try {
        const res = await requestAllMissingAction(seriesId);
        if (res.success) {
            alert(`Queued ${res.count} issues!`);
            router.refresh();
        } else {
            alert(res.message || "No issues to request.");
        }
    } catch (e) {
        console.error(e);
        alert("Failed to request issues.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Button className="w-full" onClick={handleBatch} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <DownloadCloud className="w-4 h-4 mr-2"/>}
        {loading ? "Queuing..." : "Request All Missing"}
    </Button>
  );
}


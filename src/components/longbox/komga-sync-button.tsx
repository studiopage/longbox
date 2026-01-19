'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Server, Loader2 } from 'lucide-react';
import { syncSeriesWithKomgaAction } from '@/actions/komga-sync';
import { useRouter } from 'next/navigation';

export function KomgaSyncButton({ seriesId }: { seriesId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await syncSeriesWithKomgaAction(seriesId);
      if (res.success) {
        // Optional: Show success message
        router.refresh(); // Refresh to show updated status
      } else {
        console.warn(res.message);
        alert(res.message || "No match found in Komga.");
      }
    } catch (error) {
      console.error("Komga sync failed:", error);
      alert("Failed to sync with Komga. Check settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSync} 
      disabled={loading}
    >
      <Server className={`w-4 h-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
      {loading ? "Checking..." : "Check Komga"}
    </Button>
  );
}


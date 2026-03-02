'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { importSeriesAction } from '@/actions/library';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function ImportButton({ cvId }: { cvId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleImport = async () => {
    setLoading(true);
    try {
      const result = await importSeriesAction(cvId);
      if (result.success) {
        toast.success("Series imported successfully");
        router.push(`/series/${result.localId}`);
      } else {
        toast.error(result.message || "Failed to import series");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to import series");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleImport} disabled={loading}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <PlusCircle className="w-4 h-4 mr-2" />
      )}
      {loading ? "Importing..." : "Import Series"}
    </Button>
  );
}


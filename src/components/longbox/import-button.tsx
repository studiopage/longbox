'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { importSeriesAction } from '@/actions/library';
import { useRouter } from 'next/navigation';

export function ImportButton({ cvId }: { cvId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleImport = async () => {
    setLoading(true);
    try {
      const result = await importSeriesAction(cvId);
      if (result.success) {
        // Redirect to the new local page
        router.push(`/series/${result.localId}`);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to import series.");
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


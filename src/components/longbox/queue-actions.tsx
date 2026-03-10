'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteRequestAction } from '@/actions/requests';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function QueueActions({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteRequestAction(requestId);
      if (result.success) {
        toast.success('Request removed');
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to remove request');
      }
    } catch {
      toast.error('Failed to remove request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={loading}
      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 shrink-0"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </Button>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { requestAllMissingAction, requestIssueAction } from '@/actions/requests';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function RequestAllMissingButton({
  seriesId,
  missingCount,
}: {
  seriesId: string;
  missingCount: number;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (missingCount === 0) return null;

  const handleRequest = async () => {
    setLoading(true);
    try {
      const result = await requestAllMissingAction(seriesId);
      if (result.success) {
        toast.success(`Requested ${result.count} missing issue${result.count === 1 ? '' : 's'}`);
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to create requests');
      }
    } catch {
      toast.error('Failed to create requests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRequest}
      disabled={loading}
      className="text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <ShoppingCart className="w-4 h-4 mr-2" />
      )}
      Request {missingCount} Missing
    </Button>
  );
}

export function RequestIssueButton({
  issueId,
  status,
}: {
  issueId: string;
  status: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Only show for missing issues
  if (status !== 'missing') return null;

  const handleRequest = async () => {
    setLoading(true);
    try {
      const result = await requestIssueAction(issueId);
      if (result.success) {
        toast.success('Issue requested');
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to request issue');
      }
    } catch {
      toast.error('Failed to request issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className="absolute bottom-2 right-2 bg-amber-500/80 hover:bg-amber-500 text-black rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Request this issue"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <ShoppingCart className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

'use client'

import { Button } from '@/components/ui/button';
import { Download, Loader2, Check } from 'lucide-react';
import { useState } from 'react';
import { requestIssueAction } from '@/actions/requests';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function RequestButton({ issueId, currentStatus }: { issueId: string, currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequest = async () => {
    setLoading(true);
    try {
        const res = await requestIssueAction(issueId);
        if (res.success) {
            setStatus('wanted');
            toast.success("Issue added to request queue");
            router.refresh();
        } else {
            toast.error("Failed to request issue");
        }
    } catch(e) {
        console.error(e);
        toast.error("Failed to request issue");
    } finally {
        setLoading(false);
    }
  };

  if (status === 'downloaded') {
    return (
      <Button size="sm" variant="ghost" disabled>
        <Check className="w-4 h-4 text-primary/70"/>
      </Button>
    );
  }
  
  if (status === 'wanted') {
    return (
        <Button variant="secondary" size="sm" disabled className="h-8 text-primary/50 bg-primary/10">
            <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Queued
        </Button>
    );
  }

  return (
    <Button variant="ghost" size="sm" className="h-8" onClick={handleRequest} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 opacity-50 hover:opacity-100" />}
    </Button>
  );
}

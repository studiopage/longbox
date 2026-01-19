'use client';

import { useTransition } from 'react';
import { approveImport, rejectImport } from './actions';
import { Check, Trash2, Loader2 } from 'lucide-react';

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => rejectImport(id))}
      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded transition disabled:opacity-50"
      title="Ignore/Delete from Queue"
    >
      {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
    </button>
  );
}

export function ApproveButton({ id, seriesName, metadata }: { id: string, seriesName: string, metadata: string | null }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => approveImport(id, seriesName, metadata))}
      className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-bold hover:bg-zinc-200 transition disabled:opacity-50 text-sm"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      {isPending ? "Adding..." : "Add to Library"}
    </button>
  );
}

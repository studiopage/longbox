'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, CheckCircle2, ArrowRight, ExternalLink, X, Search } from 'lucide-react';
import type { QueueItem } from '@/utils/queue';

export default function ReviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/review');
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to load queue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch('/api/review/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await loadQueue();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to approve item');
      }
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve item');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch('/api/review/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await loadQueue();
      }
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('Failed to reject item');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="bg-zinc-950 text-zinc-50 font-sans p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Import Queue</h1>
            <p className="text-zinc-400 mt-1">
              <span className="font-semibold text-blue-400">{items.length}</span> items need human review
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadQueue}
              disabled={loading}
              className="bg-zinc-900 border border-zinc-800 text-zinc-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-zinc-800 mb-3 text-5xl flex justify-center">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-medium text-zinc-200">All caught up!</h3>
              <p className="text-zinc-500">No items waiting for review.</p>
            </div>
          ) : (
            <table className="w-full text-left table-fixed">
              <thead className="bg-zinc-900/50 border-b border-zinc-800 text-xs uppercase text-zinc-400 font-semibold">
                <tr>
                  <th className="w-[35%] p-4">Local Candidate</th>
                  <th className="w-[5%] text-center">
                    <ArrowRight className="w-4 h-4 text-zinc-700 inline" />
                  </th>
                  <th className="w-[35%] p-4">ComicVine Match</th>
                  <th className="w-[10%] p-4 text-center">Score</th>
                  <th className="w-[15%] p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors group">
                    
                    <td className="p-4 align-middle">
                      <div className="font-bold text-zinc-200 truncate" title={item.localTitle}>
                        {item.localTitle}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                        {item.localYear ? (
                          <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
                            {item.localYear}
                          </span>
                        ) : (
                          <span className="text-zinc-600 italic">No Year</span>
                        )}
                        <span className="truncate max-w-[150px] cursor-help border-b border-dotted border-zinc-700 hover:text-zinc-400 transition-colors" title={item.filePath}>
                          {item.filePath.substring(0, 15)}...
                        </span>
                      </div>
                    </td>

                    <td className="text-center align-middle">
                      <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-blue-500 transition-colors inline" />
                    </td>
                    
                    <td className="p-4 align-middle">
                      <div className="font-bold text-blue-400 truncate" title={item.remoteTitle}>
                        {item.remoteTitle}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                        <span className="bg-blue-900/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-900/50 font-mono">
                          {item.remoteYear || 'N/A'}
                        </span>
                        <a
                          href={`https://comicvine.gamespot.com/volume/4050-${item.remoteId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400 hover:underline decoration-blue-800 transition-colors flex items-center gap-1"
                        >
                          #{item.remoteId}
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                      </div>
                    </td>
                    
                    <td className="p-4 align-middle text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`text-sm font-bold ${
                          item.score > 85 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {item.score.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full ${item.score > 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => router.push(`/review/fix/${item.id}`)}
                          className="bg-blue-600 hover:bg-blue-500 text-white w-8 h-8 rounded shadow-sm flex items-center justify-center transition border border-blue-500/50"
                          title="Manual Search"
                        >
                          <Search className="w-3 h-3" />
                        </button>
                        
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={processing === item.id}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white w-8 h-8 rounded shadow-sm flex items-center justify-center transition border border-emerald-500/50"
                          title="Approve Import"
                        >
                          {processing === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={processing === item.id}
                          className="bg-zinc-800 border border-zinc-700 hover:bg-rose-900/30 hover:border-rose-800 text-zinc-400 hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed w-8 h-8 rounded shadow-sm flex items-center justify-center transition"
                          title="Reject & Skip"
                        >
                          {processing === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


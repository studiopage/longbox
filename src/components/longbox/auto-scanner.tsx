'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, RotateCcw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { tryAutoMatchAction } from '@/actions/automatch';
import { useRouter } from 'next/navigation';

export function AutoScanner({ untracked }: { untracked: any[] }) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ imported: 0, skipped: 0, errors: 0 });
  
  // Use a ref to track running state instantly (prevents race conditions)
  const isRunningRef = useRef(false);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const startScan = async () => {
    if (isRunningRef.current) return;
    
    setIsRunning(true);
    isRunningRef.current = true;
    setLogs([]);
    setStats({ imported: 0, skipped: 0, errors: 0 });
    setProgress(0);
    
    let processed = 0;
    
    for (const item of untracked) {
        // Stop if user clicked stop (or component unmounted)
        if (!isRunningRef.current) break;

        const logMsg = `🔍 Analyzing: ${item.metadata.title || item.name}...`;
        addLog(logMsg);

        try {
            // CALL SERVER
            const res = await tryAutoMatchAction(item);
            
            if (res.success) {
                setStats(s => ({ ...s, imported: s.imported + 1 }));
                addLog(`✅ IMPORTED: ${res.match}`);
            } else {
                setStats(s => ({ ...s, skipped: s.skipped + 1 }));
                // Optional: Log skips if you want detailed info
                // addLog(`⚠️ SKIPPED: ${res.reason}`); 
            }

        } catch (err) {
            console.error("Auto-Scan Error:", err);
            setStats(s => ({ ...s, errors: s.errors + 1 }));
            addLog(`❌ ERROR: Database/Network fail. Retrying...`);
            
            // 🛑 SAFETY PAUSE: If DB is overloaded, wait longer (5 seconds)
            await new Promise(r => setTimeout(r, 5000));
        }

        processed++;
        setProgress((processed / untracked.length) * 100);
        
        // STANDARD RATE LIMIT (2 seconds to be safe)
        await new Promise(r => setTimeout(r, 2000)); 
    }
    
    setIsRunning(false);
    isRunningRef.current = false;
    router.refresh();
  };

  const stopScan = () => {
      isRunningRef.current = false;
      setIsRunning(false);
      addLog("🛑 Stopping scan...");
  };

  return (
    <div className="bg-card border rounded p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <h3 className="font-semibold text-lg">Auto-Match Engine</h3>
                <p className="text-sm text-muted-foreground">
                    Attempt to strictly match {untracked.length} series.
                </p>
            </div>
            {!isRunning ? (
                <Button onClick={startScan}>
                    <Play className="w-4 h-4 mr-2" /> Start Auto-Scan
                </Button>
            ) : (
                <Button variant="destructive" onClick={stopScan}>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" /> Stop Scanning
                </Button>
            )}
        </div>

        {/* PROGRESS BAR */}
        <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
        </div>

        {/* RESULTS GRID */}
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary/70" />
                <div>
                    <div className="text-2xl font-bold">{stats.imported}</div>
                    <div className="text-xs text-muted-foreground">Imported</div>
                </div>
            </div>
            <div className="bg-muted border rounded-lg p-3 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                    <div className="text-2xl font-bold">{stats.skipped}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
            </div>
             <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                    <div className="text-2xl font-bold">{stats.errors}</div>
                    <div className="text-xs text-muted-foreground">Errors (Retried)</div>
                </div>
            </div>
        </div>

        {/* LIVE LOGS */}
        <div className="bg-secondary rounded-lg p-3 h-32 overflow-hidden font-mono text-xs text-muted-foreground space-y-1">
            {logs.map((log, i) => (
                <div key={i} className={
                    log.includes("IMPORTED") ? "text-primary/70" :
                    log.includes("ERROR") ? "text-destructive" : ""
                }>
                    {log}
                </div>
            ))}
            {logs.length === 0 && <span className="opacity-50">Waiting to start...</span>}
        </div>
    </div>
  );
}

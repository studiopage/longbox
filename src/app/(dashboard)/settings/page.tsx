'use client';

import { useState, useEffect } from 'react';
import { triggerScan, saveSettings, getSettings } from './actions';
import { RotateCw, HardDrive, CheckCircle2, Key, Save } from 'lucide-react';

export default function SettingsPage() {
  // Scanner State
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  // Settings State
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Load existing key on mount
  useEffect(() => {
    getSettings().then(s => {
      if (s?.cv_api_key) setApiKey(s.cv_api_key);
    });
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanMsg("Scanning /comics...");
    const res = await triggerScan();
    setScanning(false);
    
    if (res.success) {
      const msg = res.queued 
        ? `Added ${res.count} books. ${res.queued} files queued for review.`
        : `Success! Added ${res.count} books.`;
      setScanMsg(msg);
    } else {
      setScanMsg("Scan failed. Check server console.");
    }
  };

  const handleSaveKey = async () => {
    setSaving(true);
    await saveSettings({ cv_api_key: apiKey });
    setSaving(false);
    setSaveMsg("API Key Saved!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-zinc-100 space-y-8">
      
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-black tracking-tight">System Settings</h1>
        <p className="text-zinc-500 mt-2">Server Configuration & Tools</p>
      </div>

      {/* 1. STORAGE & SCANNER */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
           <HardDrive className="w-5 h-5 text-blue-500" /> Library Management
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2">
            {/* Path Info */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-zinc-300">Library Path</span>
                    <div className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                    </div>
                </div>
                <code className="block bg-black/50 p-3 rounded text-sm font-mono text-zinc-400">
                    {process.env.NEXT_PUBLIC_LIBRARY_PATH || '/comics'}
                </code>
            </div>

            {/* Scanner Action */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-zinc-300">Run Indexer</h3>
                    <p className="text-zinc-500 text-xs mt-1 mb-4">
                        Scan for new .cbz files and parse metadata.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleScan}
                        disabled={scanning}
                        className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-zinc-200 transition disabled:opacity-50"
                    >
                        <RotateCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
                        {scanning ? "Indexing..." : "Scan Now"}
                    </button>
                    {scanMsg && <span className="text-xs text-zinc-400 animate-in fade-in">{scanMsg}</span>}
                </div>
            </div>
        </div>
      </section>

      {/* 2. METADATA PROVIDERS */}
      <section className="space-y-4 pt-4 border-t border-zinc-800">
        <h2 className="text-xl font-bold flex items-center gap-2">
           <Key className="w-5 h-5 text-yellow-500" /> Metadata Providers
        </h2>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">ComicVine API Key</label>
            <div className="flex gap-4">
                <input 
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="flex-1 bg-black/50 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
                />
                <button 
                    onClick={handleSaveKey}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save"}
                </button>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
                Required for fetching covers and plot summaries. Get one at <a href="https://comicvine.gamespot.com/api/" target="_blank" className="underline hover:text-white">comicvine.gamespot.com</a>.
            </p>
            {saveMsg && <p className="text-sm text-green-400 mt-2 font-medium animate-in fade-in">{saveMsg}</p>}
        </div>
      </section>

    </div>
  );
}

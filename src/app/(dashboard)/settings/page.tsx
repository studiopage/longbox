'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { triggerScan, saveSettings, getSettings, testMetronConnection, getWebhookUrl, saveWebhookUrl } from './actions';
import { updateUserPreferences } from '@/actions/auth';
import { RotateCw, HardDrive, CheckCircle2, Key, Save, BookOpen, Database, Loader2, User, BookMarked, Webhook, Copy, Check, Rss } from 'lucide-react';
import { ScannerProgress } from '@/components/longbox/scanner-progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsOverview } from '@/components/longbox/stats-overview';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function OpdsConnectionCard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const opdsBase = `${baseUrl}/api/opds/v1.2`;

  const feeds = [
    { label: 'Catalog Root', path: '/catalog', description: 'Main entry point for OPDS readers' },
    { label: 'All Series', path: '/series', description: 'Browse all series with book counts' },
    { label: 'Publishers', path: '/publishers', description: 'Browse by publisher' },
    { label: 'Recently Added', path: '/new', description: 'Latest 50 additions' },
    { label: 'Reading List', path: '/reading', description: 'Your in-progress books' },
    { label: 'Collections', path: '/collections', description: 'Smart and manual collections' },
    { label: 'Search', path: '/search?q={searchTerms}', description: 'OpenSearch endpoint' },
  ];

  const copyToClipboard = async (key: string, value: string) => {
    try {
      // navigator.clipboard requires HTTPS; fall back to execCommand for HTTP
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('Failed to copy — try selecting and copying manually');
    }
  };

  return (
    <div className="group relative overflow-hidden rounded border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Rss className="w-4 h-4 text-primary" />
        <label className="text-sm font-medium text-foreground">OPDS Feeds</label>
        <span className="text-xs text-muted-foreground">(Mihon / External Readers)</span>
      </div>

      {/* Primary catalog URL — prominent */}
      <div className="mb-4">
        <label className="block text-xs text-muted-foreground mb-1">Catalog URL (use this in Mihon)</label>
        <div className="flex gap-2">
          <code className="flex-1 bg-secondary border border-border rounded px-4 py-2 text-sm font-mono text-foreground truncate">
            {baseUrl ? `${opdsBase}/catalog` : 'Loading...'}
          </code>
          <button
            type="button"
            onClick={() => copyToClipboard('catalog', `${opdsBase}/catalog`)}
            disabled={!baseUrl}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90 transition duration-200 ease-out disabled:opacity-50 shrink-0"
          >
            {copiedKey === 'catalog' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedKey === 'catalog' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Individual feed URLs */}
      <details className="group/details">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
          Show all feed endpoints
        </summary>
        <div className="mt-3 space-y-2">
          {feeds.map((feed) => (
            <div key={feed.path} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground shrink-0">{feed.label}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">— {feed.description}</span>
                </div>
                <code className="block text-xs font-mono text-muted-foreground truncate">
                  {baseUrl ? `${opdsBase}${feed.path}` : '...'}
                </code>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(feed.path, `${opdsBase}${feed.path}`)}
                disabled={!baseUrl}
                className="p-1.5 rounded hover:bg-accent transition-colors shrink-0"
                title={`Copy ${feed.label} URL`}
              >
                {copiedKey === feed.path ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
        </div>
      </details>

      {/* Setup instructions */}
      <div className="mt-4 p-3 bg-secondary/50 border border-border rounded text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Mihon Setup</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Install the OPDS extension in Mihon</li>
          <li>Add a new source with the Catalog URL above</li>
          <li>Enter your Longbox email and password as credentials</li>
        </ol>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();

  // Scanner State
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  // ComicVine Settings State
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Metron Settings State
  const [metronUsername, setMetronUsername] = useState("");
  const [metronApiKey, setMetronApiKey] = useState("");
  const [savingMetron, setSavingMetron] = useState(false);
  const [metronMsg, setMetronMsg] = useState("");
  const [testingMetron, setTestingMetron] = useState(false);

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState("");

  // User Preferences State
  const [readMode, setReadMode] = useState('standard');
  const [autoScroll, setAutoScroll] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [gridSize, setGridSize] = useState('medium');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState("");

  // Load existing settings on mount
  useEffect(() => {
    getSettings().then(s => {
      if (s?.cv_api_key) setApiKey(s.cv_api_key);
      if (s?.metron_username) setMetronUsername(s.metron_username);
      if (s?.metron_api_key) setMetronApiKey(s.metron_api_key);
    });
    getWebhookUrl().then(url => {
      if (url) setWebhookUrl(url);
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

  const handleSaveMetron = async () => {
    setSavingMetron(true);
    await saveSettings({ metron_username: metronUsername, metron_api_key: metronApiKey });
    setSavingMetron(false);
    setMetronMsg("Metron credentials saved!");
    setTimeout(() => setMetronMsg(""), 3000);
  };

  const handleTestMetron = async () => {
    setTestingMetron(true);
    const result = await testMetronConnection(metronUsername, metronApiKey);
    setTestingMetron(false);
    setMetronMsg(result.message);
    setTimeout(() => setMetronMsg(""), 5000);
  };

  const handleSaveWebhook = async () => {
    setSavingWebhook(true);
    await saveWebhookUrl(webhookUrl);
    setSavingWebhook(false);
    setWebhookMsg("Webhook URL saved!");
    setTimeout(() => setWebhookMsg(""), 3000);
  };

  const handleSavePreferences = async () => {
    if (!session?.user?.id) return;
    setSavingPrefs(true);
    try {
      await updateUserPreferences(session.user.id, {
        defaultReadMode: readMode,
        autoScroll,
        defaultBrightness: brightness,
        gridSize,
      });
      setPrefsMsg("Preferences saved!");
      setTimeout(() => setPrefsMsg(""), 3000);
    } catch (error) {
      setPrefsMsg("Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="p-8 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Library Management</h1>
          <p className="text-muted-foreground mt-1">Manage your comic library, metadata, and system configuration</p>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <StatsOverview />

      {/* TABBED INTERFACE */}
      <Tabs defaultValue="scanner" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary border border-border sticky top-0 z-10 rounded">
          <TabsTrigger value="scanner" className="flex items-center gap-2 data-[state=active]:text-primary">
            <HardDrive className="w-4 h-4" />
            Scanner
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:text-primary">
            <Key className="w-4 h-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2 data-[state=active]:text-primary">
            <User className="w-4 h-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* SCANNER TAB */}
        <TabsContent value="scanner" className="space-y-6 min-h-[600px]">
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Library Scanner</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Path Info - Glass Card */}
              <div className="group relative overflow-hidden rounded border border-border bg-card p-6 hover:bg-accent transition-all duration-200 ease-out">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-foreground">Library Path</span>
                  <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-primary/70 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                </div>
                <code className="block bg-secondary border border-border p-3 rounded text-sm font-mono text-muted-foreground">
                  {process.env.NEXT_PUBLIC_LIBRARY_PATH || '/comics'}
                </code>
                <p className="text-xs text-muted-foreground mt-3">
                  All .cbz files in this directory and subdirectories will be indexed.
                </p>
              </div>

              {/* Scanner Action - Glass Card */}
              <div className="group relative overflow-hidden rounded border border-border bg-card p-6 hover:bg-accent transition-all duration-200 ease-out flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-foreground">Run Indexer</h3>
                  <p className="text-muted-foreground text-xs mt-1 mb-4">
                    Scan for new .cbz files and parse metadata. This will detect new series and issues.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-bold text-sm hover:bg-primary/90 transition duration-200 ease-out disabled:opacity-50"
                  >
                    <RotateCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
                    {scanning ? "Indexing..." : "Scan Now"}
                  </button>
                  {scanMsg && !scanning && <span className="text-xs text-muted-foreground animate-in fade-in">{scanMsg}</span>}
                </div>
              </div>
            </div>

            {/* Real-time Scanner Progress */}
            {scanning && <ScannerProgress isScanning={scanning} />}

            {/* Scanner Info - Glass Card */}
            <div className="group relative overflow-hidden rounded border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2 text-sm text-foreground">
                  <p className="font-semibold text-foreground">How the Scanner Works</p>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    <li>Recursively scans the library path for .cbz files</li>
                    <li>Extracts metadata from ComicInfo.xml if available</li>
                    <li>Parses series name and issue number from filename</li>
                    <li>Automatically matches to existing series or creates new ones</li>
                    <li>Low-confidence matches go to the Triage queue for review</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Triage Link */}
            <div className="group relative overflow-hidden rounded border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground">File Triage</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Review and assign unmatched files to series
                  </p>
                </div>
                <a
                  href="/triage"
                  className="flex items-center gap-2 bg-secondary text-foreground px-4 py-2 rounded font-medium hover:bg-accent transition-colors text-sm"
                >
                  Open Triage
                </a>
              </div>
            </div>
          </section>
        </TabsContent>

        {/* CONFIGURATION TAB */}
        <TabsContent value="config" className="space-y-6 min-h-[600px]">
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-primary/50" />
              <h2 className="text-xl font-bold text-foreground">API Configuration</h2>
            </div>

            <div className="grid gap-6">
              {/* ComicVine API Key Card - Glass */}
              <div className="group relative overflow-hidden rounded border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-destructive" />
                  <label className="text-sm font-medium text-foreground">ComicVine API Key</label>
                  <span className="text-xs text-muted-foreground">(Primary)</span>
                </div>
                <div className="flex gap-4">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="flex-1 bg-secondary border border-border rounded px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition duration-200 ease-out"
                  />
                  <button
                    onClick={handleSaveKey}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded font-bold hover:bg-primary/90 transition duration-200 ease-out disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Required for fetching covers, descriptions, and metadata from ComicVine. Get one at <a href="https://comicvine.gamespot.com/api/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition duration-200 ease-out">comicvine.gamespot.com</a>.
                </p>
                {saveMsg && <p className="text-sm text-primary/70 mt-2 font-medium animate-in fade-in">{saveMsg}</p>}
              </div>

              {/* Metron API Card - Glass */}
              <div className="group relative overflow-hidden rounded border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-primary" />
                  <label className="text-sm font-medium text-foreground">Metron API</label>
                  <span className="text-xs text-muted-foreground">(Secondary - Credits & Story Arcs)</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Username</label>
                    <input
                      type="text"
                      value={metronUsername}
                      onChange={(e) => setMetronUsername(e.target.value)}
                      placeholder="Your Metron username..."
                      className="w-full bg-secondary border border-border rounded px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition duration-200 ease-out"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">API Key</label>
                    <input
                      type="password"
                      value={metronApiKey}
                      onChange={(e) => setMetronApiKey(e.target.value)}
                      placeholder="Your Metron API key..."
                      className="w-full bg-secondary border border-border rounded px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition duration-200 ease-out"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleTestMetron}
                      disabled={testingMetron || !metronUsername || !metronApiKey}
                      className="flex items-center gap-2 bg-secondary text-foreground px-4 py-2 rounded font-medium hover:bg-accent transition duration-200 ease-out disabled:opacity-50"
                    >
                      {testingMetron ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Test Connection
                    </button>
                    <button
                      onClick={handleSaveMetron}
                      disabled={savingMetron}
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded font-bold hover:bg-primary/90 transition duration-200 ease-out disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingMetron ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Optional. Provides detailed credits, story arcs, and variant covers. Get credentials at <a href="https://metron.cloud/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition duration-200 ease-out">metron.cloud</a>.
                </p>
                {metronMsg && (
                  <p className={`text-sm mt-2 font-medium animate-in fade-in ${metronMsg.includes('Connected') || metronMsg.includes('saved') ? 'text-primary/70' : 'text-destructive'}`}>
                    {metronMsg}
                  </p>
                )}
              </div>

              {/* Webhook URL Card - Glass */}
              <div className="group relative overflow-hidden rounded border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Webhook className="w-4 h-4 text-primary" />
                  <label className="text-sm font-medium text-foreground">Webhook URL</label>
                  <span className="text-xs text-muted-foreground">(n8n / Automation)</span>
                </div>
                <div className="flex gap-4">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-n8n-instance.com/webhook/..."
                    className="flex-1 bg-secondary border border-border rounded px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition duration-200 ease-out"
                  />
                  <button
                    onClick={handleSaveWebhook}
                    disabled={savingWebhook}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded font-bold hover:bg-primary/90 transition duration-200 ease-out disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingWebhook ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Fires on new requests and fulfillments. Payload includes series name, issue number, publisher, and ComicVine ID. Leave blank to disable.
                </p>
                {webhookMsg && <p className="text-sm text-primary/70 mt-2 font-medium animate-in fade-in">{webhookMsg}</p>}
              </div>

              {/* OPDS Connection Info */}
              <OpdsConnectionCard />

              {/* System Info - Glass Card */}
              <div className="group relative overflow-hidden rounded border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">System Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Version</span>
                    <p className="font-mono text-foreground">v0.3.0</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Database</span>
                    <p className="font-mono text-foreground">PostgreSQL (Local)</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Node Environment</span>
                    <p className="font-mono text-foreground">{process.env.NODE_ENV || 'development'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ComicVine API</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-primary/70' : 'bg-destructive'}`} />
                      <span className="font-mono text-foreground">{apiKey ? 'Configured' : 'Not Set'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Metron API</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${metronUsername && metronApiKey ? 'bg-primary/70' : 'bg-primary/50'}`} />
                      <span className="font-mono text-foreground">{metronUsername && metronApiKey ? 'Configured' : 'Optional'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        {/* PREFERENCES TAB */}
        <TabsContent value="preferences" className="space-y-6 min-h-[600px]">
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">User Preferences</h2>
            </div>

            <div className="grid gap-6">
              {/* Reading Preferences - Glass Card */}
              <div className="group relative overflow-hidden rounded border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookMarked className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-foreground">Reading Preferences</h3>
                </div>

                <div className="space-y-6">
                  {/* Default Read Mode */}
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">Default Read Mode</Label>
                    <div className="flex gap-2">
                      {['standard', 'rtl', 'webtoon'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setReadMode(mode)}
                          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                            readMode === mode
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
                          }`}
                        >
                          {mode === 'standard' ? 'Standard (LTR)' : mode === 'rtl' ? 'Manga (RTL)' : 'Webtoon'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Choose how pages are displayed by default when reading</p>
                  </div>

                  {/* Auto Scroll */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm text-foreground">Auto-Scroll</Label>
                      <p className="text-xs text-muted-foreground">Automatically scroll through pages</p>
                    </div>
                    <button
                      onClick={() => setAutoScroll(!autoScroll)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        autoScroll ? 'bg-primary' : 'bg-secondary'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-foreground rounded-full absolute top-0.5 transition-transform ${
                          autoScroll ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Default Brightness */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-foreground">Default Brightness</Label>
                      <span className="text-sm text-muted-foreground">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full h-2 bg-secondary rounded appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Display Preferences - Glass Card */}
              <div className="group relative overflow-hidden rounded border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-primary/70" />
                  <h3 className="font-bold text-foreground">Display Preferences</h3>
                </div>

                <div className="space-y-6">
                  {/* Grid Size */}
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">Grid Size</Label>
                    <div className="flex gap-2">
                      {['small', 'medium', 'large'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setGridSize(size)}
                          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                            gridSize === size
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
                          }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Size of book covers in grid views</p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSavePreferences}
                  disabled={savingPrefs || !session?.user}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded font-bold hover:bg-primary/90 transition duration-200 ease-out disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingPrefs ? "Saving..." : "Save Preferences"}
                </button>
                {prefsMsg && (
                  <p className={`text-sm font-medium animate-in fade-in ${prefsMsg.includes('saved') ? 'text-primary/70' : 'text-destructive'}`}>
                    {prefsMsg}
                  </p>
                )}
                {!session?.user && (
                  <p className="text-sm text-primary/50">Sign in to save preferences</p>
                )}
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>

    </div>
  );
}

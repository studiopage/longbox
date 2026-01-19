'use client'

import { useEffect, useState } from 'react';
import { getSettings, saveSettings, testComicVineConnection, testKomgaConnection } from '@/actions/settings';
import { getLibraryPath, updateLibraryPathAction, triggerManualScan } from '@/actions/app-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Save, RefreshCw } from 'lucide-react';

function RescanButton() {
  const [loading, setLoading] = useState(false);

  const handleRescan = async () => {
    setLoading(true);
    try {
      const result = await triggerManualScan();
      if (result.error) {
        alert(`Failed: ${result.error}`);
      } else {
        alert(`✅ ${result.message || 'Scanner restarted successfully!'}`);
      }
    } catch (error) {
      alert('Failed to trigger rescan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
      <div>
        <h3 className="font-medium">Force Library Rescan</h3>
        <p className="text-sm text-muted-foreground">
          Manually trigger the scanner to crawl all folders for new files.
        </p>
      </div>
      <Button 
        onClick={handleRescan}
        disabled={loading}
        variant="outline"
        className="flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Rescanning...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Rescan Now
          </>
        )}
      </Button>
    </div>
  );
}

function LibraryPathForm() {
  const [libraryPath, setLibraryPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const path = await getLibraryPath();
      setLibraryPath(path);
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('path', libraryPath);
      const result = await updateLibraryPathAction(formData);
      
      if (result.error) {
        alert(`Failed: ${result.error}`);
      } else {
        alert(`✅ ${result.message || 'Library path updated! Scanner restarted.'}`);
      }
    } catch (error) {
      alert('Failed to update library path');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="block text-sm font-medium mb-2">
          Container Root Path
        </Label>
        <Input
          type="text"
          value={libraryPath}
          onChange={(e) => setLibraryPath(e.target.value)}
          placeholder="/comics"
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Current Scanner Target: <span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">{libraryPath || '/comics'}</span>
        </p>
        <div className="bg-amber-900/20 dark:bg-amber-900/30 border border-amber-900/50 dark:border-amber-800/50 rounded p-3 text-xs text-amber-200 dark:text-amber-300 flex gap-2 items-start mt-3">
          <span>⚠️</span>
          <div>
            <strong>Docker Configuration Required:</strong>
            <br />
            Ensure your <code className="bg-black/30 dark:bg-white/10 px-1 py-0.5 rounded">docker-compose.yml</code> maps the host volume to this path.
            <br />
            <code className="block mt-1 bg-black/30 dark:bg-white/10 p-1.5 rounded font-mono text-[10px]">
              volumes: - /volume1/comics:{libraryPath || '/comics'}:ro
            </code>
          </div>
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </>
        )}
      </Button>
    </form>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    cv_api_key: '',
    komga_url: '',
    komga_user: '',
    komga_pass: '',
    kapowarr_url: '',
    kapowarr_key: ''
  });

  // Test States
  const [cvStatus, setCvStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [komgaStatus, setKomgaStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    async function load() {
      const data = await getSettings();
      if (data) {
        setFormData({
            cv_api_key: data.cv_api_key || '',
            komga_url: data.komga_url || '',
            komga_user: data.komga_user || '',
            komga_pass: data.komga_pass || '',
            kapowarr_url: data.kapowarr_url || '',
            kapowarr_key: data.kapowarr_key || ''
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    await saveSettings(formData);
    alert("Settings Saved"); // Fallback
  };

  const handleTestCV = async () => {
    setCvStatus('testing');
    const res = await testComicVineConnection(formData.cv_api_key);
    setCvStatus(res.success ? 'success' : 'error');
  };

  const handleTestKomga = async () => {
    setKomgaStatus('testing');
    const res = await testKomgaConnection(formData.komga_url, formData.komga_user, formData.komga_pass);
    setKomgaStatus(res.success ? 'success' : 'error');
  };

  if (loading) return <div className="p-8">Loading configuration...</div>;

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground">Manage your integrations and connections.</p>
        </div>
        <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="integrations" className="space-y-6 mt-6">
            
            {/* COMIC VINE CARD */}
            <Card>
                <CardHeader>
                    <CardTitle>ComicVine Metadata</CardTitle>
                    <CardDescription>Required for series discovery and issue details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>API Key</Label>
                        <div className="flex gap-2">
                            <Input 
                                type="password" 
                                value={formData.cv_api_key} 
                                onChange={(e) => setFormData({...formData, cv_api_key: e.target.value})}
                                placeholder="CV-..."
                            />
                            <Button variant="secondary" onClick={handleTestCV} disabled={cvStatus === 'testing'}>
                                {cvStatus === 'testing' ? <Loader2 className="animate-spin w-4 h-4"/> : "Test"}
                            </Button>
                        </div>
                        {cvStatus === 'success' && <p className="text-xs text-green-500 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Connected</p>}
                        {cvStatus === 'error' && <p className="text-xs text-red-500 flex items-center"><XCircle className="w-3 h-3 mr-1"/> Connection Failed</p>}
                    </div>
                </CardContent>
            </Card>

            {/* KOMGA CARD */}
            <Card>
                <CardHeader>
                    <CardTitle>Komga Server</CardTitle>
                    <CardDescription>Connect to your local library for read syncing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Server URL</Label>
                            <Input 
                                placeholder="http://localhost:25600" 
                                value={formData.komga_url}
                                onChange={(e) => setFormData({...formData, komga_url: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Username</Label>
                            <Input 
                                value={formData.komga_user}
                                onChange={(e) => setFormData({...formData, komga_user: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input 
                                type="password" 
                                value={formData.komga_pass}
                                onChange={(e) => setFormData({...formData, komga_pass: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button variant="secondary" onClick={handleTestKomga} disabled={komgaStatus === 'testing'}>
                             {komgaStatus === 'testing' ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : "Test Connection"}
                             {!komgaStatus && "Test Connection"}
                        </Button>
                        {komgaStatus === 'success' && <span className="ml-3 text-xs text-green-500 inline-flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Connected</span>}
                        {komgaStatus === 'error' && <span className="ml-3 text-xs text-red-500 inline-flex items-center"><XCircle className="w-3 h-3 mr-1"/> Failed</span>}
                    </div>
                </CardContent>
            </Card>

            {/* KAPOWARR CARD (Placeholder for Phase 1.5) */}
            <Card className="opacity-75">
                <CardHeader>
                    <CardTitle>Kapowarr (Downloader)</CardTitle>
                    <CardDescription>Coming in Module 3. Configure your acquisition engine.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label>Kapowarr URL</Label>
                        <Input disabled placeholder="http://localhost:5656" />
                    </div>
                </CardContent>
            </Card>

        </TabsContent>

        <TabsContent value="system" className="space-y-6 mt-6">
            {/* LIBRARY PATH CARD */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="text-xl">📚</span> Media Library
                    </CardTitle>
                    <CardDescription>Configure the scanner directory path.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LibraryPathForm />
                </CardContent>
            </Card>

            {/* MAINTENANCE CARD */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="text-xl">🛠️</span> Maintenance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <RescanButton />

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                        <div>
                            <h3 className="font-medium">Clear Metadata Cache</h3>
                            <p className="text-sm text-muted-foreground">
                                Clear cached metadata and force fresh lookups.
                            </p>
                        </div>
                        <Button variant="destructive">Clear Cache</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

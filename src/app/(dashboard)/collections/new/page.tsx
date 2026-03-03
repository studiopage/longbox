'use client';

import { useState } from 'react';
import { ArrowLeft, Zap, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { RuleBuilder } from '@/components/longbox/rule-builder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconPicker } from '@/components/longbox/icon-picker';
import { createCollection } from '@/actions/collections';
import { useRouter } from 'next/navigation';

export default function NewCollectionPage() {
  const [mode, setMode] = useState<'smart' | 'manual'>('smart');

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-2xl">
      {/* Back link */}
      <Link
        href="/collections"
        className="flex items-center gap-1.5 text-sm text-[rgba(255,255,255,0.32)] hover:text-[#c0c8b8] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Collections
      </Link>

      <h1 className="text-2xl font-bold text-foreground">New Collection</h1>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('smart')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
            mode === 'smart'
              ? 'bg-[rgba(160,180,145,0.2)] text-[#c0c8b8]'
              : 'bg-[rgba(160,180,145,0.05)] text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.5)]'
          }`}
        >
          <Zap className="w-4 h-4" />
          Smart Collection
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
            mode === 'manual'
              ? 'bg-[rgba(160,180,145,0.2)] text-[#c0c8b8]'
              : 'bg-[rgba(160,180,145,0.05)] text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.5)]'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Manual Collection
        </button>
      </div>

      {mode === 'smart' ? (
        <RuleBuilder />
      ) : (
        <ManualCollectionForm />
      )}
    </main>
  );
}

function ManualCollectionForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>('FolderOpen');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = await createCollection(name.trim(), { icon: icon ?? undefined });
      if (result.success && result.collection) {
        router.push(`/collections/${result.collection.id}`);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs text-[rgba(255,255,255,0.32)]">Collection Name</Label>
        <div className="flex items-center gap-3">
          <IconPicker value={icon} onChange={setIcon} />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Collection"
            className="flex-1 bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-[rgba(160,180,145,0.2)] hover:bg-[rgba(160,180,145,0.3)] text-[#c0c8b8] text-sm font-medium transition-colors disabled:opacity-50"
      >
        {saving ? 'Creating...' : 'Create Collection'}
      </button>
    </div>
  );
}

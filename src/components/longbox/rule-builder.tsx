'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConditionRow } from './condition-row';
import { IconPicker } from './icon-picker';
import { CollectionPreview } from './collection-preview';
import { createCollection, updateCollection } from '@/actions/collections';
import type { SmartRules, Condition, ConditionField, SortPreference } from '@/types/longbox';

const SORT_OPTIONS: { label: string; value: SortPreference }[] = [
  { label: 'Date Added (Newest)', value: 'date_added_desc' },
  { label: 'Date Added (Oldest)', value: 'date_added_asc' },
  { label: 'Title (A-Z)', value: 'title_asc' },
  { label: 'Title (Z-A)', value: 'title_desc' },
  { label: 'Issue Number (Asc)', value: 'issue_number_asc' },
  { label: 'Issue Number (Desc)', value: 'issue_number_desc' },
  { label: 'Year (Oldest)', value: 'year_asc' },
  { label: 'Year (Newest)', value: 'year_desc' },
  { label: 'Publisher (A-Z)', value: 'publisher_asc' },
];

interface RuleBuilderProps {
  /** Existing collection ID when editing */
  collectionId?: string;
  /** Pre-populated values when editing */
  initialValues?: {
    name: string;
    icon: string | null;
    match: 'all' | 'any';
    conditions: Condition[];
    sortPreference: string | null;
    pinned: boolean;
    description: string | null;
  };
  /** Available collections for the "In Collection" field */
  collections?: { id: string; name: string }[];
}

const DEFAULT_CONDITION: Condition = {
  field: 'publisher' as ConditionField,
  operator: 'is',
  value: '',
};

export function RuleBuilder({ collectionId, initialValues, collections }: RuleBuilderProps) {
  const router = useRouter();
  const isEditing = !!collectionId;

  const [name, setName] = useState(initialValues?.name ?? '');
  const [icon, setIcon] = useState<string | null>(initialValues?.icon ?? 'BookOpen');
  const [match, setMatch] = useState<'all' | 'any'>(initialValues?.match ?? 'all');
  const [conditions, setConditions] = useState<Condition[]>(
    initialValues?.conditions ?? [{ ...DEFAULT_CONDITION }]
  );
  const [sortPreference, setSortPreference] = useState<string>(
    initialValues?.sortPreference ?? 'date_added_desc'
  );
  const [pinned, setPinned] = useState(initialValues?.pinned ?? false);
  const [saving, setSaving] = useState(false);

  const rules: SmartRules = { match, conditions };

  const addCondition = useCallback(() => {
    setConditions((prev) => [...prev, { ...DEFAULT_CONDITION }]);
  }, []);

  const updateCondition = useCallback((index: number, condition: Condition) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? condition : c)));
  }, []);

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    try {
      if (isEditing) {
        await updateCollection(collectionId, {
          name: name.trim(),
          smartRules: conditions.length > 0 ? rules : null,
          pinned,
          icon,
          sortPreference,
        });
        router.push(`/collections/${collectionId}`);
      } else {
        const result = await createCollection(name.trim(), {
          smartRules: conditions.length > 0 ? rules : undefined,
          pinned,
          icon: icon ?? undefined,
          sortPreference,
        });
        if (result.success && result.collection) {
          router.push(`/collections/${result.collection.id}`);
        }
      }
      router.refresh();
    } catch (error) {
      console.error('[RULE BUILDER] Save failed:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Name + Icon */}
      <div className="space-y-2">
        <Label className="text-xs text-[rgba(255,255,255,0.32)]">Collection Name</Label>
        <div className="flex items-center gap-3">
          <IconPicker value={icon} onChange={setIcon} />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DC Unread, 90s Marvel..."
            className="flex-1 bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]"
          />
        </div>
      </div>

      {/* Match mode toggle */}
      <div className="space-y-2">
        <Label className="text-xs text-[rgba(255,255,255,0.32)]">Match Mode</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMatch('all')}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              match === 'all'
                ? 'bg-[rgba(160,180,145,0.2)] text-[#c0c8b8]'
                : 'bg-[rgba(160,180,145,0.05)] text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.5)]'
            }`}
          >
            Match All
          </button>
          <button
            type="button"
            onClick={() => setMatch('any')}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              match === 'any'
                ? 'bg-[rgba(160,180,145,0.2)] text-[#c0c8b8]'
                : 'bg-[rgba(160,180,145,0.05)] text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.5)]'
            }`}
          >
            Match Any
          </button>
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        <Label className="text-xs text-[rgba(255,255,255,0.32)]">Conditions</Label>
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <ConditionRow
              key={index}
              condition={condition}
              onChange={(c) => updateCondition(index, c)}
              onRemove={() => removeCondition(index)}
              collections={collections}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addCondition}
          className="flex items-center gap-1.5 text-xs text-[rgba(160,180,145,0.5)] hover:text-[#c0c8b8] transition-colors px-2 py-1.5 rounded hover:bg-[rgba(160,180,145,0.08)]"
        >
          <Plus className="w-3.5 h-3.5" />
          Add condition
        </button>
      </div>

      {/* Sort preference */}
      <div className="space-y-2">
        <Label className="text-xs text-[rgba(255,255,255,0.32)]">Sort By</Label>
        <Select value={sortPreference} onValueChange={setSortPreference}>
          <SelectTrigger className="w-[220px] text-xs h-8 bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      {conditions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-[rgba(255,255,255,0.32)]">Preview</Label>
          <div className="rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(160,180,145,0.04)] p-3">
            <CollectionPreview rules={rules} />
          </div>
        </div>
      )}

      {/* Pin to sidebar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPinned(!pinned)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            pinned ? 'bg-[rgba(160,180,145,0.4)]' : 'bg-[rgba(255,255,255,0.1)]'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              pinned ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
        <Label className="text-xs text-[#c0c8b8]">Pin to sidebar</Label>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-[rgba(160,180,145,0.2)] hover:bg-[rgba(160,180,145,0.3)] text-[#c0c8b8] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {isEditing ? 'Save Changes' : 'Create Collection'}
      </button>
    </div>
  );
}

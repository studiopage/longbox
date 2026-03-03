'use client';

import { useState } from 'react';
import {
  BookOpen, Swords, Shield, Skull, Crown, Flame, Zap, Star, Heart,
  AlertTriangle, Clock, Eye, Bookmark, Archive, FolderOpen, Library,
  Layers, Grid3x3, Filter, Hash,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const ICONS = [
  { name: 'BookOpen', component: BookOpen },
  { name: 'Swords', component: Swords },
  { name: 'Shield', component: Shield },
  { name: 'Skull', component: Skull },
  { name: 'Crown', component: Crown },
  { name: 'Flame', component: Flame },
  { name: 'Zap', component: Zap },
  { name: 'Star', component: Star },
  { name: 'Heart', component: Heart },
  { name: 'AlertTriangle', component: AlertTriangle },
  { name: 'Clock', component: Clock },
  { name: 'Eye', component: Eye },
  { name: 'Bookmark', component: Bookmark },
  { name: 'Archive', component: Archive },
  { name: 'FolderOpen', component: FolderOpen },
  { name: 'Library', component: Library },
  { name: 'Layers', component: Layers },
  { name: 'Grid3x3', component: Grid3x3 },
  { name: 'Filter', component: Filter },
  { name: 'Hash', component: Hash },
] as const;

interface IconPickerProps {
  value: string | null;
  onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = ICONS.find((i) => i.name === value);
  const SelectedIcon = selected?.component ?? BookOpen;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(160,180,145,0.08)] hover:bg-[rgba(160,180,145,0.15)] transition-colors text-sm text-[#c0c8b8]"
        >
          <SelectedIcon className="w-4 h-4" />
          <span className="text-xs">{value ?? 'Pick icon'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-2" align="start">
        <div className="grid grid-cols-5 gap-1">
          {ICONS.map(({ name, component: Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={`p-2 rounded hover:bg-[rgba(160,180,145,0.15)] transition-colors flex items-center justify-center ${
                value === name
                  ? 'bg-[rgba(160,180,145,0.2)] text-[rgba(160,180,145,0.8)]'
                  : 'text-[rgba(255,255,255,0.32)]'
              }`}
              title={name}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Render a Lucide icon by name string. Falls back to BookOpen. */
export function DynamicIcon({ name, className }: { name: string | null; className?: string }) {
  const icon = ICONS.find((i) => i.name === name);
  const Icon = icon?.component ?? BookOpen;
  return <Icon className={className} />;
}

'use client';

import { useState } from 'react';
import { Download, RotateCw, Palette, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReadMode = 'standard' | 'rtl' | 'webtoon';

interface ReaderSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  readMode: ReadMode;
  onReadModeChange: (mode: ReadMode) => void;
  autoScroll: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onSavePage: () => void;
  onRotate: () => void;
  onOpenColorCorrection: () => void;
  bookTitle: string;
  chapterInfo?: string;
}

export function ReaderSettingsSheet({
  open,
  onClose,
  readMode,
  onReadModeChange,
  autoScroll,
  onAutoScrollChange,
  isFullscreen,
  onFullscreenToggle,
  onSavePage,
  onRotate,
  onOpenColorCorrection,
  bookTitle,
  chapterInfo,
}: ReaderSettingsSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 z-40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl transition-transform duration-300 ease-out max-h-[80vh] overflow-y-auto',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-6 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">{bookTitle}</h2>
              {chapterInfo && (
                <p className="text-sm text-muted-foreground">{chapterInfo}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 mb-6">
            <button
              onClick={onSavePage}
              className="w-full flex items-center gap-4 px-4 py-3 rounded hover:bg-accent transition-colors"
            >
              <Download className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Save page</span>
            </button>

            <button
              onClick={onRotate}
              className="w-full flex items-center gap-4 px-4 py-3 rounded hover:bg-accent transition-colors"
            >
              <RotateCw className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Rotate screen</span>
            </button>

            <button
              onClick={() => {
                onFullscreenToggle();
                onClose();
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded hover:bg-accent transition-colors"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">Exit fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">Fullscreen</span>
                </>
              )}
            </button>
          </div>

          {/* Read Mode */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Read mode</h3>
            <div className="grid grid-cols-3 gap-2">
              <ReadModeButton
                active={readMode === 'standard'}
                onClick={() => onReadModeChange('standard')}
                icon={<StandardIcon />}
                label="Standard"
              />
              <ReadModeButton
                active={readMode === 'rtl'}
                onClick={() => onReadModeChange('rtl')}
                icon={<RtlIcon />}
                label="Right-to-left"
              />
              <ReadModeButton
                active={readMode === 'webtoon'}
                onClick={() => onReadModeChange('webtoon')}
                icon={<WebtoonIcon />}
                label="Webtoon"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              The chosen configuration will be remembered for this comic
            </p>
          </div>

          {/* Auto Scroll Toggle */}
          <div className="flex items-center justify-between py-3 mb-4">
            <div className="flex items-center gap-4">
              <AutoScrollIcon className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Automatic scroll</span>
            </div>
            <Toggle checked={autoScroll} onChange={onAutoScrollChange} />
          </div>

          {/* Color Correction */}
          <button
            onClick={onOpenColorCorrection}
            className="w-full flex items-center justify-between px-4 py-3 rounded hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-4">
              <Palette className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Color correction</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </>
  );
}

// Read Mode Button Component
function ReadModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent'
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Toggle Component
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-12 h-7 rounded-full transition-colors relative',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <div
        className={cn(
          'absolute top-1 w-5 h-5 bg-foreground rounded-full transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

// Icons
function StandardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

function RtlIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M16 8l-4 4 4 4" />
    </svg>
  );
}

function WebtoonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <line x1="6" y1="8" x2="18" y2="8" />
      <line x1="6" y1="13" x2="18" y2="13" />
    </svg>
  );
}

function AutoScrollIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 8 12 12 14 14" />
    </svg>
  );
}

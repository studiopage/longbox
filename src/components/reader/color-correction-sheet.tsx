'use client';

import { X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorCorrectionSheetProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  invertColors: boolean;
  onInvertChange: (inverted: boolean) => void;
  brightness: number;
  onBrightnessChange: (brightness: number) => void;
  previewUrl?: string;
}

export function ColorCorrectionSheet({
  open,
  onClose,
  onBack,
  invertColors,
  onInvertChange,
  brightness,
  onBrightnessChange,
  previewUrl,
}: ColorCorrectionSheetProps) {
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
          'fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-6 pb-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-lg font-bold text-foreground">Color correction</h2>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="relative mb-6 flex justify-center">
              <div className="relative w-48 rounded overflow-hidden shadow-2xl">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-auto"
                  style={{
                    filter: `brightness(${brightness / 100}) ${invertColors ? 'invert(1)' : ''}`,
                  }}
                />
                {/* Arrow indicator */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full px-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Invert Colors Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <span className="text-foreground font-medium">Invert colors</span>
            <Toggle checked={invertColors} onChange={onInvertChange} />
          </div>

          {/* Brightness Slider */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-foreground font-medium">Brightness</span>
              <span className="text-muted-foreground text-sm">{brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => onBrightnessChange(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:bg-primary
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:cursor-pointer
                [&::-moz-range-thumb]:border-0"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Darker</span>
              <span>Brighter</span>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              onInvertChange(false);
              onBrightnessChange(100);
            }}
            className="w-full mt-4 py-3 text-primary font-medium hover:bg-accent rounded transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </>
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

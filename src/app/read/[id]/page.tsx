'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Settings, Maximize, Minimize } from 'lucide-react';
import { getBookInfo, saveReadingProgress } from '@/actions/reading';
import { ReaderSettingsSheet, ReadMode } from '@/components/reader/reader-settings-sheet';
import { ColorCorrectionSheet } from '@/components/reader/color-correction-sheet';
import { cn } from '@/lib/utils';

// Storage keys
const STORAGE_KEY_PREFIX = 'reader_settings_';

interface ReaderSettings {
  readMode: ReadMode;
  autoScroll: boolean;
  invertColors: boolean;
  brightness: number;
  rotation: number;
}

const defaultSettings: ReaderSettings = {
  readMode: 'standard',
  autoScroll: false,
  invertColors: false,
  brightness: 100,
  rotation: 0,
};

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  // Core state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [bookTitle, setBookTitle] = useState('');

  // Settings state
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [colorCorrectionOpen, setColorCorrectionOpen] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Webtoon mode: load all pages
  const [webtoonPages, setWebtoonPages] = useState<number[]>([]);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        // Ignore parse errors
      }
    }
  }, [id]);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: ReaderSettings) => {
    setSettings(newSettings);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(newSettings));
  }, [id]);

  // Fetch book info on mount
  useEffect(() => {
    async function fetchBookInfo() {
      const result = await getBookInfo(id);
      if (result.success && result.book) {
        setTotalPages(result.book.totalPages);
        setBookTitle(result.book.title || '');
        // Initialize webtoon pages array
        if (result.book.totalPages > 0) {
          setWebtoonPages(Array.from({ length: result.book.totalPages }, (_, i) => i + 1));
        }
      }
    }
    fetchBookInfo();
  }, [id]);

  // Save progress whenever page changes
  useEffect(() => {
    if (totalPages > 0 && page > 0) {
      saveReadingProgress(id, page, totalPages);
    }
  }, [id, page, totalPages]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (settings.autoScroll && settings.readMode === 'webtoon' && containerRef.current) {
      autoScrollRef.current = window.setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop += 1;
        }
      }, 30);
    }

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [settings.autoScroll, settings.readMode]);

  // Toggle UI controls
  const toggleControls = () => {
    if (!settingsOpen && !colorCorrectionOpen) {
      setControlsVisible(!controlsVisible);
    }
  };

  // Navigation functions based on read mode
  const goNext = useCallback(() => {
    if (settings.readMode === 'rtl') {
      // Right-to-left: next means going to previous page number
      if (page > 1) {
        setPage(p => p - 1);
        setLoading(true);
      }
    } else {
      if (totalPages > 0 && page >= totalPages) return;
      setPage(p => p + 1);
      setLoading(true);
    }
  }, [page, totalPages, settings.readMode]);

  const goPrev = useCallback(() => {
    if (settings.readMode === 'rtl') {
      // Right-to-left: prev means going to next page number
      if (totalPages > 0 && page >= totalPages) return;
      setPage(p => p + 1);
      setLoading(true);
    } else {
      if (page > 1) {
        setPage(p => p - 1);
        setLoading(true);
      }
    }
  }, [page, totalPages, settings.readMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (settingsOpen || colorCorrectionOpen) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          router.back();
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router, goNext, goPrev, settingsOpen, colorCorrectionOpen, isFullscreen, toggleFullscreen]);

  // Touch/click zone navigation for Standard/RTL modes
  const handleImageClick = (e: React.MouseEvent) => {
    if (settings.readMode === 'webtoon') {
      toggleControls();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.3) {
      // Left 30% - go previous
      goPrev();
    } else if (clickX > width * 0.7) {
      // Right 30% - go next
      goNext();
    } else {
      // Middle - toggle controls
      toggleControls();
    }
  };

  // Save current page as image
  const handleSavePage = async () => {
    try {
      const response = await fetch(`/api/read/${id}/${page}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bookTitle || 'page'}_${page}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSettingsOpen(false);
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  // Rotate screen
  const handleRotate = () => {
    const newRotation = (settings.rotation + 90) % 360;
    saveSettings({ ...settings, rotation: newRotation });
  };

  // Image style with color corrections
  const imageStyle: React.CSSProperties = {
    filter: `brightness(${settings.brightness / 100}) ${settings.invertColors ? 'invert(1)' : ''}`,
    transform: settings.rotation ? `rotate(${settings.rotation}deg)` : undefined,
  };

  // Progress percentage
  const progressPercent = totalPages > 0 ? (page / totalPages) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 bg-black overflow-hidden z-50',
        settings.readMode === 'webtoon' && 'overflow-y-auto'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'fixed inset-x-0 top-0 z-30 transition-all duration-300',
          controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        )}
      >
        <div className="bg-gradient-to-b from-black/90 via-black/60 to-transparent">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>

            <div className="flex-1 text-center px-4">
              <p className="text-white font-medium">
                {settings.readMode === 'webtoon' ? 'Scroll mode' : `Page ${page} of ${totalPages || '...'}`}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {/* Fullscreen button - visible on desktop */}
              <button
                onClick={toggleFullscreen}
                className="hidden md:flex p-2 hover:bg-white/10 rounded-full transition-colors"
                title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
              >
                {isFullscreen ? (
                  <Minimize className="w-6 h-6 text-white" />
                ) : (
                  <Maximize className="w-6 h-6 text-white" />
                )}
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 -mr-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Settings className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {settings.readMode === 'webtoon' ? (
        // Webtoon Mode - Vertical scroll
        <div className="flex flex-col items-center pt-20 pb-32" onClick={toggleControls}>
          {webtoonPages.map((pageNum) => (
            <img
              key={pageNum}
              src={`/api/read/${id}/${pageNum}`}
              alt={`Page ${pageNum}`}
              className="w-full max-w-3xl"
              style={imageStyle}
              loading="lazy"
            />
          ))}
        </div>
      ) : (
        // Standard / RTL Mode - Single page view
        <div
          className="relative w-full h-full flex items-center justify-center cursor-pointer"
          onClick={handleImageClick}
        >
          <img
            key={page}
            src={`/api/read/${id}/${page}`}
            alt={`Page ${page}`}
            className="max-h-screen max-w-full object-contain select-none"
            style={imageStyle}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Touch zone indicators (shown briefly on first load) */}
          <div className="absolute inset-0 pointer-events-none opacity-0">
            <div className="absolute left-0 top-0 bottom-0 w-[30%] bg-white/5" />
            <div className="absolute right-0 top-0 bottom-0 w-[30%] bg-white/5" />
          </div>
        </div>
      )}

      {/* Footer Navigation (Standard/RTL modes) */}
      {settings.readMode !== 'webtoon' && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 transition-all duration-300',
            controlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          )}
        >
          <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            {/* Progress bar */}
            <div className="px-4 mb-2">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center justify-center gap-6 px-4 py-4 pb-6">
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                disabled={settings.readMode === 'rtl' ? (totalPages > 0 && page >= totalPages) : page <= 1}
                className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-full disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              {/* Page indicator */}
              <div className="text-white font-mono text-lg min-w-[100px] text-center">
                <span className="text-2xl font-bold">{page}</span>
                <span className="text-zinc-400"> / {totalPages || '...'}</span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                disabled={settings.readMode === 'rtl' ? page <= 1 : (totalPages > 0 && page >= totalPages)}
                className="bg-white text-black p-4 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md shadow-lg transition-colors"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Sheet */}
      <ReaderSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        readMode={settings.readMode}
        onReadModeChange={(mode) => saveSettings({ ...settings, readMode: mode })}
        autoScroll={settings.autoScroll}
        onAutoScrollChange={(enabled) => saveSettings({ ...settings, autoScroll: enabled })}
        isFullscreen={isFullscreen}
        onFullscreenToggle={toggleFullscreen}
        onSavePage={handleSavePage}
        onRotate={handleRotate}
        onOpenColorCorrection={() => {
          setSettingsOpen(false);
          setTimeout(() => setColorCorrectionOpen(true), 300);
        }}
        bookTitle={bookTitle}
        chapterInfo={totalPages > 0 ? `${totalPages} pages` : undefined}
      />

      {/* Color Correction Sheet */}
      <ColorCorrectionSheet
        open={colorCorrectionOpen}
        onClose={() => setColorCorrectionOpen(false)}
        onBack={() => {
          setColorCorrectionOpen(false);
          setTimeout(() => setSettingsOpen(true), 300);
        }}
        invertColors={settings.invertColors}
        onInvertChange={(inverted) => saveSettings({ ...settings, invertColors: inverted })}
        brightness={settings.brightness}
        onBrightnessChange={(brightness) => saveSettings({ ...settings, brightness })}
        previewUrl={`/api/read/${id}/${page}`}
      />
    </div>
  );
}

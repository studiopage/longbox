'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Settings, Maximize, Minimize, BookOpen, SkipForward, Star, Library } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { getBookInfo, saveReadingProgress } from '@/actions/reading';
import { getNextUnreadInSeries, getSeriesReadMode, saveSeriesReadMode, saveBookReview } from '@/actions/reader-features';
import type { NextUnreadResult } from '@/actions/reader-features';
import { ReaderSettingsSheet, ReadMode } from '@/components/reader/reader-settings-sheet';
import { ColorCorrectionSheet } from '@/components/reader/color-correction-sheet';
import { cn } from '@/lib/utils';

// Storage keys
const STORAGE_KEY_PREFIX = 'reader_settings_';

// Minimum swipe distance (px) to trigger navigation
const SWIPE_THRESHOLD = 50;
// Maximum vertical deviation before we cancel a horizontal swipe
const SWIPE_MAX_Y = 80;

interface ReaderSettings {
  readMode: ReadMode;
  autoScroll: boolean;
  invertColors: boolean;
  brightness: number;
  rotation: number;
  doublePageSpread: boolean;
}

const defaultSettings: ReaderSettings = {
  readMode: 'standard',
  autoScroll: false,
  invertColors: false,
  brightness: 100,
  rotation: 0,
  doublePageSpread: false,
};

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const zoomScaleRef = useRef(1);

  // Core state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [bookTitle, setBookTitle] = useState('');
  const [seriesId, setSeriesId] = useState<string | null>(null);

  // End-of-book / next unread state
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [nextUnread, setNextUnread] = useState<NextUnreadResult | null>(null);
  const [endRating, setEndRating] = useState<number>(0);

  // Page transition
  const [transitioning, setTransitioning] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [colorCorrectionOpen, setColorCorrectionOpen] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Webtoon mode: load all pages
  const [webtoonPages, setWebtoonPages] = useState<number[]>([]);

  // Scrubber drag state
  const [scrubberDragging, setScrubberDragging] = useState(false);
  const [scrubberPage, setScrubberPage] = useState<number | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Swipe tracking refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Landscape detection for double-page spread
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkLandscape = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkLandscape();
    window.addEventListener('resize', checkLandscape);
    return () => window.removeEventListener('resize', checkLandscape);
  }, []);

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

  // Save settings to localStorage (and series preference if read mode changed)
  const saveSettings = useCallback((newSettings: ReaderSettings) => {
    setSettings(prev => {
      // If read mode changed, also save as series preference
      if (prev.readMode !== newSettings.readMode && seriesId) {
        saveSeriesReadMode(seriesId, newSettings.readMode);
      }
      return newSettings;
    });
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(newSettings));
  }, [id, seriesId]);

  // Fetch book info on mount
  useEffect(() => {
    async function fetchBookInfo() {
      const result = await getBookInfo(id);
      if (result.success && result.book) {
        setTotalPages(result.book.totalPages);
        setBookTitle(result.book.title || '');
        setSeriesId(result.book.seriesId);
        // Resume from saved progress
        if (result.book.currentPage && result.book.currentPage > 1) {
          setPage(result.book.currentPage);
        }
        // Initialize webtoon pages array
        if (result.book.totalPages > 0) {
          setWebtoonPages(Array.from({ length: result.book.totalPages }, (_, i) => i + 1));
        }
        // Load per-series read mode preference
        if (result.book.seriesId) {
          const seriesMode = await getSeriesReadMode(result.book.seriesId);
          if (seriesMode) {
            const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
            const current = stored ? JSON.parse(stored) : {};
            // Only apply if user hasn't manually set a mode for this specific book
            if (!current.readMode || current.readMode === 'standard') {
              setSettings(prev => ({ ...prev, readMode: seriesMode as ReadMode }));
            }
          }
        }
        // Prefetch next unread for end-of-book screen
        getNextUnreadInSeries(id).then(setNextUnread);
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

  // Preload next (and previous) page images for instant transitions
  useEffect(() => {
    if (settings.readMode === 'webtoon' || totalPages === 0) return;

    const pagesToPreload: number[] = [];

    // In double-page mode, preload the next 2 pages
    const step = (settings.doublePageSpread && isLandscape) ? 2 : 1;

    if (page + step <= totalPages) pagesToPreload.push(page + step);
    if (page + step + 1 <= totalPages && settings.doublePageSpread && isLandscape) {
      pagesToPreload.push(page + step + 1);
    }
    // Also preload the adjacent page for double-spread
    if (settings.doublePageSpread && isLandscape && page + 1 <= totalPages) {
      pagesToPreload.push(page + 1);
    }
    if (page - 1 >= 1) pagesToPreload.push(page - 1);

    const images: HTMLImageElement[] = [];
    for (const p of pagesToPreload) {
      const img = new Image();
      img.src = `/api/read/${id}/${p}`;
      images.push(img);
    }

    return () => {
      // Cancel loads on cleanup
      for (const img of images) {
        img.src = '';
      }
    };
  }, [page, totalPages, id, settings.readMode, settings.doublePageSpread, isLandscape]);

  // Fullscreen handling — auto-hide controls when entering fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fs) {
        setControlsVisible(false);
      }
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

  // Determine page step for double-page mode
  const pageStep = (settings.doublePageSpread && isLandscape && settings.readMode !== 'webtoon') ? 2 : 1;

  // Navigation functions based on read mode
  const goNext = useCallback(() => {
    const atEnd = settings.readMode === 'rtl' ? page <= 1 : (totalPages > 0 && page >= totalPages);
    if (atEnd) {
      // Show end-of-book screen
      setShowEndScreen(true);
      setControlsVisible(false);
      return;
    }

    setTransitioning(true);
    setTimeout(() => setTransitioning(false), 200);

    if (settings.readMode === 'rtl') {
      setPage(p => Math.max(1, p - pageStep));
    } else {
      setPage(p => Math.min(totalPages, p + pageStep));
    }
    setLoading(true);
  }, [page, totalPages, settings.readMode, pageStep]);

  const goPrev = useCallback(() => {
    if (showEndScreen) {
      setShowEndScreen(false);
      return;
    }

    setTransitioning(true);
    setTimeout(() => setTransitioning(false), 200);

    if (settings.readMode === 'rtl') {
      if (totalPages > 0 && page >= totalPages) return;
      setPage(p => Math.min(totalPages, p + pageStep));
      setLoading(true);
    } else {
      if (page > 1) {
        setPage(p => Math.max(1, p - pageStep));
        setLoading(true);
      }
    }
  }, [page, totalPages, settings.readMode, pageStep, showEndScreen]);

  // Jump to specific page (from scrubber)
  const goToPage = useCallback((targetPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, targetPage));
    setPage(clamped);
    setLoading(true);
  }, [totalPages]);

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
      // Toggle double-page with 'd'
      if (e.key === 'd' || e.key === 'D') {
        saveSettings({ ...settings, doublePageSpread: !settings.doublePageSpread });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router, goNext, goPrev, settingsOpen, colorCorrectionOpen, isFullscreen, toggleFullscreen, settings, saveSettings]);

  // Swipe gesture handlers for mobile navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (settings.readMode === 'webtoon') return;
    if (zoomScaleRef.current > 1.05) return; // Don't swipe when zoomed

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, [settings.readMode]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (settings.readMode === 'webtoon') return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const elapsed = Date.now() - touchStartRef.current.time;

    touchStartRef.current = null;

    // Must be a horizontal swipe: enough X distance, not too much Y, under 500ms
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || deltaY > SWIPE_MAX_Y || elapsed > 500) {
      return;
    }

    if (deltaX < 0) {
      // Swiped left → next
      goNext();
    } else {
      // Swiped right → prev
      goPrev();
    }
  }, [settings.readMode, goNext, goPrev]);

  // Scrubber drag handlers
  const scrubberPageFromEvent = useCallback((clientX: number): number => {
    if (!scrubberRef.current || totalPages === 0) return page;
    const rect = scrubberRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.max(1, Math.round(ratio * totalPages));
  }, [totalPages, page]);

  const handleScrubberPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setScrubberDragging(true);
    const target = scrubberPageFromEvent(e.clientX);
    setScrubberPage(target);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [scrubberPageFromEvent]);

  const handleScrubberPointerMove = useCallback((e: React.PointerEvent) => {
    if (!scrubberDragging) return;
    e.preventDefault();
    const target = scrubberPageFromEvent(e.clientX);
    setScrubberPage(target);
  }, [scrubberDragging, scrubberPageFromEvent]);

  const handleScrubberPointerUp = useCallback((e: React.PointerEvent) => {
    if (!scrubberDragging) return;
    e.preventDefault();
    setScrubberDragging(false);
    const target = scrubberPageFromEvent(e.clientX);
    setScrubberPage(null);
    goToPage(target);
  }, [scrubberDragging, scrubberPageFromEvent, goToPage]);

  // Touch/click zone navigation for Standard/RTL modes
  const handleZoneClick = (e: React.MouseEvent) => {
    if (settings.readMode === 'webtoon') {
      toggleControls();
      return;
    }

    // When zoomed in, only toggle controls — don't navigate
    if (zoomScaleRef.current > 1.05) {
      toggleControls();
      return;
    }

    const clickX = e.clientX;
    const width = window.innerWidth;

    if (clickX < width * 0.35) {
      goPrev();
    } else if (clickX > width * 0.65) {
      goNext();
    } else {
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

  // Image style with color corrections + page transition
  const imageStyle: React.CSSProperties = {
    filter: `brightness(${settings.brightness / 100}) ${settings.invertColors ? 'invert(1)' : ''}`,
    transform: settings.rotation ? `rotate(${settings.rotation}deg)` : undefined,
    opacity: transitioning ? 0 : 1,
    transition: 'opacity 150ms ease-in-out',
  };

  // Progress percentage
  const displayPage = scrubberPage ?? page;
  const progressPercent = totalPages > 0 ? (displayPage / totalPages) * 100 : 0;

  // Double-page spread: show current + next page side by side in landscape
  const showDoublePage = settings.doublePageSpread && isLandscape && settings.readMode !== 'webtoon';
  const secondPage = showDoublePage && page + 1 <= totalPages ? page + 1 : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 bg-black overflow-hidden z-50',
        settings.readMode === 'webtoon' && 'overflow-y-auto'
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div
        className={cn(
          'fixed inset-x-0 top-0 z-30 transition-all duration-300',
          controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
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
              <p className="text-white font-medium truncate">
                {settings.readMode === 'webtoon' ? 'Scroll mode' : `Page ${displayPage} of ${totalPages || '...'}`}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {/* Double-page toggle - visible on desktop landscape */}
              {isLandscape && settings.readMode !== 'webtoon' && (
                <button
                  onClick={() => saveSettings({ ...settings, doublePageSpread: !settings.doublePageSpread })}
                  className={cn(
                    'hidden md:flex p-2 hover:bg-white/10 rounded-full transition-colors',
                    settings.doublePageSpread && 'bg-white/20'
                  )}
                  title={settings.doublePageSpread ? 'Single page (D)' : 'Double page (D)'}
                >
                  <BookOpen className="w-6 h-6 text-white" />
                </button>
              )}

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
        // Webtoon Mode - Vertical scroll with zoom
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={4}
          doubleClick={{ mode: 'toggle', step: 1 }}
          panning={{ disabled: false }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%', overflow: 'auto' }}
          >
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
          </TransformComponent>
        </TransformWrapper>
      ) : showDoublePage ? (
        // Double-page spread mode (landscape)
        <div className="relative w-full h-full" onClick={handleZoneClick}>
          <TransformWrapper
            key={`spread-${page}`}
            initialScale={1}
            minScale={1}
            maxScale={4}
            doubleClick={{ mode: 'toggle', step: 1 }}
            panning={{ disabled: false }}
            onTransformed={(_ref, state) => {
              zoomScaleRef.current = state.scale;
            }}
          >
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
              }}
            >
              {settings.readMode === 'rtl' ? (
                <>
                  {secondPage && (
                    <img
                      src={`/api/read/${id}/${secondPage}`}
                      alt={`Page ${secondPage}`}
                      className="h-full max-w-[50%] object-contain select-none"
                      style={imageStyle}
                      draggable={false}
                    />
                  )}
                  <img
                    src={`/api/read/${id}/${page}`}
                    alt={`Page ${page}`}
                    className={cn(
                      'h-full object-contain select-none',
                      secondPage ? 'max-w-[50%]' : 'max-w-full'
                    )}
                    style={imageStyle}
                    onLoad={() => setLoading(false)}
                    onError={() => setLoading(false)}
                    draggable={false}
                  />
                </>
              ) : (
                <>
                  <img
                    src={`/api/read/${id}/${page}`}
                    alt={`Page ${page}`}
                    className={cn(
                      'h-full object-contain select-none',
                      secondPage ? 'max-w-[50%]' : 'max-w-full'
                    )}
                    style={imageStyle}
                    onLoad={() => setLoading(false)}
                    onError={() => setLoading(false)}
                    draggable={false}
                  />
                  {secondPage && (
                    <img
                      src={`/api/read/${id}/${secondPage}`}
                      alt={`Page ${secondPage}`}
                      className="h-full max-w-[50%] object-contain select-none"
                      style={imageStyle}
                      draggable={false}
                    />
                  )}
                </>
              )}
            </TransformComponent>
          </TransformWrapper>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        // Standard / RTL Mode - Single page view with zoom
        <div className="relative w-full h-full" onClick={handleZoneClick}>
          <TransformWrapper
            key={page}
            initialScale={1}
            minScale={1}
            maxScale={4}
            doubleClick={{ mode: 'toggle', step: 1 }}
            panning={{ disabled: false }}
            onTransformed={(_ref, state) => {
              zoomScaleRef.current = state.scale;
            }}
          >
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
              }}
              contentStyle={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={`/api/read/${id}/${page}`}
                alt={`Page ${page}`}
                className="h-full w-full object-contain select-none"
                style={imageStyle}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
                draggable={false}
              />
            </TransformComponent>
          </TransformWrapper>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Footer Navigation (Standard/RTL modes) */}
      {settings.readMode !== 'webtoon' && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 transition-all duration-300',
            controlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          )}
        >
          <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8">
            {/* Page scrubber / slider */}
            <div className="px-4 mb-3">
              <div
                ref={scrubberRef}
                className="relative h-8 flex items-center cursor-pointer touch-none"
                onPointerDown={handleScrubberPointerDown}
                onPointerMove={handleScrubberPointerMove}
                onPointerUp={handleScrubberPointerUp}
                onPointerCancel={handleScrubberPointerUp}
              >
                {/* Track background */}
                <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full" />
                {/* Filled track */}
                <div
                  className="absolute left-0 h-1 bg-blue-500 rounded-full transition-[width] duration-100"
                  style={{ width: `${progressPercent}%` }}
                />
                {/* Thumb */}
                <div
                  className={cn(
                    'absolute h-5 w-5 bg-white rounded-full shadow-lg -translate-x-1/2 transition-[left] duration-100',
                    scrubberDragging && 'scale-125 bg-blue-400'
                  )}
                  style={{ left: `${progressPercent}%` }}
                />
                {/* Scrubber tooltip */}
                {scrubberDragging && scrubberPage !== null && (
                  <div
                    className="absolute -top-10 -translate-x-1/2 bg-black/90 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap backdrop-blur-sm"
                    style={{ left: `${progressPercent}%` }}
                  >
                    Page {scrubberPage}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center justify-center gap-6 px-4 py-3 pb-6">
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                disabled={settings.readMode === 'rtl' ? (totalPages > 0 && page >= totalPages) : page <= 1}
                className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-full disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              {/* Page indicator */}
              <div className="text-white font-mono text-lg min-w-[100px] text-center">
                <span className="text-2xl font-bold">{displayPage}</span>
                <span className="text-zinc-400"> / {totalPages || '...'}</span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="bg-white text-black p-4 rounded-full hover:bg-gray-200 backdrop-blur-md shadow-lg transition-colors"
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

      {/* End-of-Book Screen */}
      {showEndScreen && (
        <div className="fixed inset-0 z-40 bg-black/95 flex items-center justify-center animate-in fade-in duration-300">
          <div className="max-w-sm w-full mx-6 text-center space-y-6">
            <div className="space-y-2">
              <BookOpen className="w-12 h-12 text-white/40 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Finished</h2>
              <p className="text-zinc-400 text-sm">{bookTitle}</p>
            </div>

            {/* Star Rating */}
            <div className="space-y-2">
              <p className="text-zinc-500 text-xs uppercase tracking-wide">Rate this issue</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => {
                      const newRating = endRating === star ? 0 : star;
                      setEndRating(newRating);
                      if (newRating > 0) saveBookReview(id, newRating, null);
                    }}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'w-8 h-8 transition-colors',
                        star <= endRating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {nextUnread?.nextBookId && (
                <button
                  onClick={() => router.push(`/read/${nextUnread.nextBookId}`)}
                  className="w-full flex items-center justify-center gap-3 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                  Next: #{nextUnread.nextBookNumber ?? '?'}
                </button>
              )}

              {nextUnread && !nextUnread.nextBookId && (
                <p className="text-zinc-500 text-sm">All caught up on {nextUnread.seriesName}</p>
              )}

              <button
                onClick={() => {
                  if (nextUnread?.seriesId) {
                    router.push(`/library/${nextUnread.seriesId}`);
                  } else {
                    router.back();
                  }
                }}
                className="w-full flex items-center justify-center gap-3 bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                <Library className="w-5 h-5" />
                {nextUnread?.seriesId ? 'Back to Series' : 'Back to Library'}
              </button>

              <button
                onClick={() => setShowEndScreen(false)}
                className="w-full text-zinc-500 text-sm py-2 hover:text-zinc-300 transition-colors"
              >
                Back to last page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

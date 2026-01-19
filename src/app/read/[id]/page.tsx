'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id } = use(params);
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(30); // Placeholder default
  const [loading, setLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Toggle UI controls on click
  const toggleControls = () => setControlsVisible(!controlsVisible);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setPage(p => {
          setLoading(true);
          return p + 1;
        });
      }
      if (e.key === 'ArrowLeft') {
        setPage(p => {
          if (p > 1) {
            setLoading(true);
            return p - 1;
          }
          return p;
        });
      }
      if (e.key === 'Escape') router.back();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router]);

  const nextPage = () => {
    setPage(p => p + 1);
    setLoading(true);
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(p => p - 1);
      setLoading(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      
      {/* --- IMAGE DISPLAY --- */}
      <div 
        className="relative w-full h-full flex items-center justify-center cursor-pointer"
        onClick={toggleControls}
      >
        {/* The Magic Image Tag */}
        <img 
            key={page} // Force re-render on page change
            src={`/api/read/${id}/${page}`} 
            alt={`Page ${page}`}
            className="max-h-screen max-w-full object-contain select-none"
            onLoad={() => setLoading(false)}
        />

        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-mono animate-pulse">
                LOADING PAGE {page}...
            </div>
        )}
      </div>

      {/* --- HUD CONTROLS --- */}
      <div className={`fixed inset-x-0 top-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex justify-between items-center text-white">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-sm">Page {page}</span>
            <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* --- FOOTER CONTROLS --- */}
      <div className={`fixed inset-x-0 bottom-0 p-8 pb-12 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex justify-center gap-8">
            <button 
                onClick={(e) => { e.stopPropagation(); prevPage(); }}
                disabled={page <= 1}
                className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-full disabled:opacity-30 backdrop-blur-md"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); nextPage(); }}
                className="bg-white text-black p-4 rounded-full hover:bg-gray-200 font-bold backdrop-blur-md shadow-lg shadow-white/10"
            >
                <ArrowRight className="w-6 h-6" />
            </button>
        </div>
      </div>

    </div>
  );
}

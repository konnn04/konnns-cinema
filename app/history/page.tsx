'use client';

import Link from 'next/link';
import { History, Trash2, Play, Calendar, Film, ArrowLeft, RefreshCw, ShieldAlert } from 'lucide-react';
import { resolveImageUrl } from '@/lib/api';
import { isAdultMovie } from '@/lib/adult';
import { useWatchHistoryStore } from '@/lib/stores/useWatchHistoryStore';
import { useAdultContentStore } from '@/lib/stores/useAdultContentStore';
import { useHasMounted } from '@/hooks/useHasMounted';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import PosterImage from '@/components/PosterImage';

export default function HistoryPage() {
  const history = useWatchHistoryStore((s) => s.history);
  const removeFromHistory = useWatchHistoryStore((s) => s.remove);
  const clearHistory = useWatchHistoryStore((s) => s.clear);
  const adultUnblurred = useAdultContentStore((s) => s.unblurEnabled);

  const loading = !useHasMounted();

  const deleteEntry = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromHistory(slug);
  };

  const clearAllHistory = () => {
    if (confirm('Are you sure you want to clear your entire watch history?')) {
      clearHistory();
    }
  };

  return (
    <div className="relative min-h-screen bg-cinema-bg text-zinc-100 select-none pb-20 md:pb-0">
      <Header />

      <main className="w-full pt-24 max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-8 space-y-8">
        
        {/* Page header controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-4">
          <div className="flex items-center space-x-3">
            <History className="text-[#E2B646] w-6 h-6 animate-pulse" />
            <h1 className="font-serif font-black italic text-2xl sm:text-3xl tracking-tight text-white uppercase">
              Continue Watching
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="flex items-center space-x-1.5 px-4 py-2 hover:bg-zinc-900 border border-zinc-850 rounded-none hover:border-red-500 hover:text-red-500 text-xs font-bold text-zinc-400 transition-all cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}

            <Link href="/">
              <button className="flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 border border-zinc-850 rounded-none hover:border-[#E2B646] text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer">
                <ArrowLeft size={12} />
                <span>Back Home</span>
              </button>
            </Link>
          </div>
        </div>

        {loading ? (
          /* Skeletons */
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[9/14] w-full bg-zinc-950 border border-zinc-900 animate-pulse rounded-none" />
            ))}
          </div>
        ) : history.length > 0 ? (
          /* Custom watch history grid cards with progress bars on the lower ledge */
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 justify-items-center">
            {history.map((item) => {
              const censored = isAdultMovie(item) && !adultUnblurred;
              return (
              <div
                key={item.slug}
                className="relative flex-none w-full group select-none transition-transform duration-300 hover:scale-102"
              >
                <Link href={`/watch/${item.slug}/${item.episodeSlug}`}>
                  <div className="relative aspect-[9/14] w-full rounded-none overflow-hidden bg-zinc-900 border border-zinc-850/80 group-hover:border-[#E2B646]/50 transition-all duration-300 shadow-md">

                    {/* Poster thumbnail */}
                    <PosterImage
                      src={resolveImageUrl(item.thumb_url || item.poster_url)}
                      alt={item.name}
                      sizes="(max-width: 768px) 150px, 200px"
                      className={`object-cover transition-transform duration-500 group-hover:scale-105 ${censored ? 'blur-xl scale-110' : ''}`}
                      referrerPolicy="no-referrer"
                    />

                    {censored && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/40">
                        <ShieldAlert size={22} className="text-red-500" />
                        <span className="px-2 py-0.5 text-[9px] font-mono font-black tracking-widest bg-red-600 text-white">18+</span>
                      </div>
                    )}

                    {/* Dark gradient mask */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/35 opacity-90 group-hover:opacity-95 transition-opacity" />

                    {/* Deletion cross trigger */}
                    <button
                      onClick={(e) => deleteEntry(item.slug, e)}
                      className="absolute top-3 right-3 z-20 p-2 bg-zinc-950/80 hover:bg-red-950 rounded-none text-zinc-400 hover:text-red-500 border border-zinc-850 hover:border-red-500/30 transition-all cursor-pointer"
                      title="Delete Watch Log"
                    >
                      <Trash2 size={12} />
                    </button>

                    {/* Episode label */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider rounded-none bg-black/80 text-[#E2B646] border border-[#E2B646]/30">
                        EP {item.episodeName}
                      </span>
                    </div>

                    {/* Lower Info block */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 pb-4 flex flex-col justify-end">
                      <h3 className="font-serif font-bold text-xs sm:text-sm text-zinc-100 line-clamp-2 leading-snug group-hover:text-[#E2B646] transition-colors italic">
                        {item.name}
                      </h3>
                      <p className="font-sans text-[10px] text-zinc-500 truncate mt-1">
                        Progress: {item.progress}% watched
                      </p>
                      
                      {/* Active Progress bar on card edge */}
                      <div className="w-full bg-zinc-800 h-1 rounded-none overflow-hidden mt-2.5 border border-black/10">
                        <div
                          className="bg-[#E2B646] h-full rounded-none"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-3 bg-[#E2B646] rounded-none text-black shadow-xl glow-gold transform scale-75 group-hover:scale-100 transition-transform">
                        <Play size={18} className="fill-current" />
                      </div>
                    </div>

                  </div>
                </Link>
              </div>
              );
            })}
          </div>
        ) : (
          /* Empty history state */
          <div className="text-center py-32 space-y-4">
            <History className="w-12 h-12 text-[#E2B646] mx-auto animate-pulse" />
            <div>
              <h4 className="font-serif font-black italic text-lg text-white">No Watch History Captured</h4>
              <p className="text-xs text-zinc-600 font-sans mt-1">Streaming sessions you begin commence here for easy recovery</p>
            </div>
            <Link href="/search">
              <button className="px-6 py-2.5 bg-[#E2B646] text-black rounded-none text-xs font-serif font-black tracking-widest uppercase hover:bg-white transition-all cursor-pointer">
                Explore Catalog
              </button>
            </Link>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

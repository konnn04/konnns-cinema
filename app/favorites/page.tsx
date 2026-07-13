'use client';

import { Heart, Grid, Sparkles, Film, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import MovieCard from '@/components/MovieCard';
import { useFavoritesStore } from '@/lib/stores/useFavoritesStore';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function FavoritesPage() {
  const { t } = useLanguage();
  const favorites = useFavoritesStore((s) => s.favorites);
  // Zustand's persist middleware rehydrates from localStorage after mount, so
  // the very first client render intentionally shows the loading skeleton.
  const loading = !useHasMounted();

  return (
    <div className="relative min-h-screen bg-cinema-bg text-zinc-100 select-none pb-20 md:pb-0">
      <Header />

      <main className="w-full pt-24 max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-8 space-y-8">
        
        {/* Page title and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-4">
          <div className="flex items-center space-x-3">
            <Heart className="text-[#E2B646] w-6 h-6 animate-pulse fill-[#E2B646]" />
            <h1 className="font-serif font-black italic text-2xl sm:text-3xl tracking-tight text-white uppercase">
              {t('fav.title')}
            </h1>
          </div>
          <Link href="/">
            <button className="flex items-center space-x-2 px-4 py-2 bg-zinc-900 border border-zinc-850 rounded-none hover:border-[#E2B646] text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer">
              <ArrowLeft size={12} />
              <span>{t('fav.back')}</span>
            </button>
          </Link>
        </div>

        {loading ? (
          /* Skeletons */
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[9/14] w-full bg-zinc-950 border border-zinc-900 animate-pulse rounded-none" />
            ))}
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 justify-items-center">
            {favorites.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-32 space-y-4">
            <Heart className="w-12 h-12 text-[#E2B646] mx-auto animate-pulse" />
            <div>
              <h4 className="font-serif font-black italic text-lg text-white">{t('fav.empty')}</h4>
              <p className="text-xs text-zinc-600 font-sans mt-1">{t('fav.empty_desc')}</p>
            </div>
            <Link href="/search">
              <button className="px-6 py-2.5 bg-[#E2B646] text-black rounded-none text-xs font-serif font-black tracking-widest uppercase hover:bg-white transition-all cursor-pointer">
                {t('fav.explore')}
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

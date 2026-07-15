'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import MovieCard from './MovieCard';
import { MovieItem } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';

interface MovieRowProps {
  title: string;
  movies: MovieItem[];
  pathImage?: string;
  onFavoriteChange?: () => void;
  icon?: React.ReactNode;
  viewAllHref?: string;
}

export default function MovieRow({ title, movies, pathImage, onFavoriteChange, icon, viewAllHref }: MovieRowProps) {
  const { t } = useLanguage();
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    const el = rowRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      checkScroll();
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [movies]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative flex flex-col space-y-3 px-4 sm:px-8 md:px-12 py-6 select-none group"
    >
      {}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center space-x-3">
          {icon && <span className="text-[#E2B646]">{icon}</span>}
          <h2 className="font-serif font-black text-lg sm:text-xl md:text-2xl tracking-wide text-[#E2B646] uppercase italic">
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs sm:text-sm font-sans text-zinc-400 hover:text-[#E2B646] transition-colors shrink-0"
          >
            {t('home.view_all')}
            <ChevronRight size={16} />
          </Link>
        )}
      </div>

      <div className="relative">
        {}
        {showLeftArrow && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-20 bg-gradient-to-r from-cinema-bg to-transparent text-zinc-400 hover:text-white hover:scale-110 transition-all opacity-0 group-hover:opacity-100 hidden md:flex cursor-pointer"
          >
            <ChevronLeft size={36} />
          </button>
        )}

        {showRightArrow && (
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-20 bg-gradient-to-l from-cinema-bg to-transparent text-zinc-400 hover:text-white hover:scale-110 transition-all opacity-0 group-hover:opacity-100 hidden md:flex cursor-pointer"
          >
            <ChevronRight size={36} />
          </button>
        )}

        {}
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto overflow-y-visible py-4 px-1 no-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {movies.map((movie, index) => (
            <div key={movie._id} className="snap-start">
              <MovieCard
                movie={movie}
                pathImage={pathImage}
                onFavoriteChange={onFavoriteChange}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

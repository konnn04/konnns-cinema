'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieItem, resolveImageUrl } from '@/lib/api';
import { isAdultMovie } from '@/lib/adult';
import { useTVFocusable } from '@/hooks/useTVFocusable';
import FocusableButton from '@/components/tv/FocusableButton';
import PosterImage from '@/components/PosterImage';
import { cn } from '@/lib/utils';

interface TVMovieShelfProps {
  title: string;
  movies: MovieItem[];
}

function TVMovieCard({ movie }: { movie: MovieItem }) {
  const { ref, focused, tvFocusClassName } = useTVFocusable<HTMLAnchorElement | null>();

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [focused, ref]);

  return (
    <Link
      ref={ref}
      href={`/movie/${movie.slug}`}
      className={cn('shrink-0 w-[180px] space-y-2', tvFocusClassName)}
    >
      <div className="relative aspect-[9/14] overflow-hidden bg-zinc-900 border border-zinc-800">
        <PosterImage
          src={resolveImageUrl(movie.poster_url || movie.thumb_url)}
          alt={movie.name}
          className="object-cover"
          iconSize={28}
        />
      </div>
      <div>
        <p className="text-xs font-sans text-zinc-200 font-semibold truncate">{movie.name}</p>
        <p className="text-[10px] font-mono text-zinc-500 truncate">
          {[movie.year, movie.quality].filter(Boolean).join(' • ')}
        </p>
      </div>
    </Link>
  );
}

export default function TVMovieShelf({ title, movies }: TVMovieShelfProps) {
  const visibleMovies = movies.filter((m) => !isAdultMovie(m));
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    // A plain vertical mouse wheel over a horizontal-only shelf otherwise
    // does nothing -- redirect it to horizontal scroll.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: 'auto' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('scroll', checkScroll);
      el.removeEventListener('wheel', onWheel);
    };
  }, [visibleMovies.length]);

  if (visibleMovies.length === 0) return null;

  const scrollByPage = (direction: 'left' | 'right') => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3">
      <h2 className="font-serif font-black text-lg tracking-wide text-[#E2B646] uppercase italic">{title}</h2>
      <div className="relative group">
        {showLeftArrow && (
          <FocusableButton
            onClick={() => scrollByPage('left')}
            className="absolute left-0 top-0 bottom-2 z-10 flex items-center justify-center w-10 bg-gradient-to-r from-cinema-bg to-transparent text-zinc-400 hover:text-white cursor-pointer"
          >
            <ChevronLeft size={28} />
          </FocusableButton>
        )}
        {showRightArrow && (
          <FocusableButton
            onClick={() => scrollByPage('right')}
            className="absolute right-0 top-0 bottom-2 z-10 flex items-center justify-center w-10 bg-gradient-to-l from-cinema-bg to-transparent text-zinc-400 hover:text-white cursor-pointer"
          >
            <ChevronRight size={28} />
          </FocusableButton>
        )}
        <div ref={rowRef} className="flex gap-4 overflow-x-auto no-scrollbar pb-2 scroll-smooth">
          {visibleMovies.map((movie) => (
            <TVMovieCard key={movie._id} movie={movie} />
          ))}
        </div>
      </div>
    </div>
  );
}

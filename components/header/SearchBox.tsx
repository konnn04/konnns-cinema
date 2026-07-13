'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { api, MovieItem, resolveImageUrl } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import PosterImage from '@/components/PosterImage';

export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, translateMovieTitle } = useLanguage();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MovieItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Read search query from URL if on search page
  useEffect(() => {
    const currentKeyword = searchParams.get('keyword');
    if (currentKeyword) {
      const timer = setTimeout(() => {
        setQuery(currentKeyword);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Live Suggestions API lookup
  useEffect(() => {
    if (query.trim().length < 2) {
      const resetTimer = setTimeout(() => {
        setSuggestions([]);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchMovies(query, 1, 5);
        setSuggestions(res.items);
      } catch (err) {
        console.error('Failed to load suggestion options:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Close overlay on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      router.push(`/search?keyword=${encodeURIComponent(query.trim())}`);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={searchRef} className="relative max-w-[160px] sm:max-w-xs">
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={t('search.placeholder')}
          className="w-full bg-zinc-950/90 text-zinc-200 pl-9 pr-8 py-1.5 rounded-none text-xs font-sans border border-zinc-800 focus:outline-none focus:border-[#E2B646] focus:glow-red-orange transition-all placeholder:text-zinc-600"
        />
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-white rounded-full cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </form>

      {showSuggestions && query.trim().length >= 2 && (
        <div className="absolute right-0 top-full mt-2 w-[240px] sm:w-[320px] bg-zinc-950 border border-zinc-800 rounded-none shadow-2xl overflow-hidden z-50">
          <div className="p-3 border-b border-zinc-900 flex items-center justify-between text-[10px] uppercase font-mono tracking-widest text-zinc-500">
            <span>{t('search.suggestions')}</span>
            {isSearching && <div className="w-3.5 h-3.5 border-t border-[#E2B646] rounded-full animate-spin" />}
          </div>

          <div className="max-h-[280px] overflow-y-auto no-scrollbar py-1">
            {suggestions.length > 0 ? (
              suggestions.map((movie) => (
                <Link
                  key={movie._id}
                  href={`/movie/${movie.slug}`}
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="relative w-8 h-12 bg-zinc-900 rounded-none overflow-hidden flex-none border border-zinc-800">
                    <PosterImage
                      src={resolveImageUrl(movie.thumb_url || movie.poster_url)}
                      alt={movie.name}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                      iconSize={14}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-bold text-xs text-zinc-200 leading-tight truncate">
                      {translateMovieTitle(movie)}
                    </h4>
                    <p className="font-sans text-[10px] text-zinc-500 truncate mt-0.5">{movie.origin_name}</p>
                    <div className="flex items-center space-x-2 mt-1 text-[9px] font-mono font-semibold text-[#E2B646]">
                      <span>{movie.year}</span>
                      {movie.quality && <span>&bull; {movie.quality}</span>}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              !isSearching && (
                <p className="p-4 text-center text-xs text-zinc-600 font-sans">{t('search.no_suggestions')}</p>
              )
            )}
          </div>

          {suggestions.length > 0 && (
            <button
              onClick={handleSearchSubmit}
              className="w-full text-center py-2.5 bg-zinc-900 border-t border-zinc-850 hover:bg-[#E2B646] text-[10px] font-bold tracking-widest text-zinc-400 hover:text-black uppercase transition-colors"
            >
              {t('common.view_all_results')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

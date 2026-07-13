'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, Sliders, RefreshCw, AlertCircle, Sparkles, Film, Calendar, Grid } from 'lucide-react';
import { api, MovieItem, CategoryItem, CountryItem } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import MovieCard from '@/components/MovieCard';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Root URL parameters
  const keywordParam = searchParams.get('keyword') || '';
  const typeParam = searchParams.get('type') || '';
  const genreParam = searchParams.get('genre') || '';
  const countryParam = searchParams.get('country') || '';
  const yearParam = searchParams.get('year') || '';

  // API selection pools
  const [genres, setGenres] = useState<CategoryItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [years, setYears] = useState<number[]>([]);

  // Active filter states
  const [selectedGenre, setSelectedGenre] = useState(genreParam);
  const [selectedCountry, setSelectedCountry] = useState(countryParam);
  const [selectedYear, setSelectedYear] = useState(yearParam);
  const [sortField, setSortField] = useState<'modified.time' | '_id' | 'year'>('modified.time');
  const [sortType, setSortType] = useState<'desc' | 'asc'>('desc');

  // List content & pagination states
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load select listings on mount
  useEffect(() => {
    Promise.all([
      api.getGenres(),
      api.getCountries(),
      api.getYears(),
    ]).then(([genresData, countriesData, yearsData]) => {
      setGenres(genresData);
      setCountries(countriesData);
      setYears(yearsData);
    }).catch(err => console.error('Failed to sync filter dropdown options:', err));
  }, []);

  // Sync state filters if URL parameters change
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedGenre(genreParam);
      setSelectedCountry(countryParam);
      setSelectedYear(yearParam);
      setPage(1); // reset to page 1 on filter changes
    }, 0);
    return () => clearTimeout(timer);
  }, [genreParam, countryParam, yearParam, keywordParam, typeParam]);

  // Execute catalog query on filter trigger
  useEffect(() => {
    const fetchCatalog = async () => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const filters = {
          category: selectedGenre || undefined,
          country: selectedCountry || undefined,
          year: selectedYear || undefined,
          sort_field: sortField,
          sort_type: sortType,
        };

        let response;
        
        // Pick appropriate API call based on URL state
        if (keywordParam) {
          response = await api.searchMovies(keywordParam, page, 24, filters);
        } else if (typeParam) {
          response = await api.getMoviesByType(typeParam as any, page, filters);
        } else if (selectedGenre) {
          response = await api.getMoviesByGenre(selectedGenre, page, filters);
        } else if (selectedCountry) {
          response = await api.getMoviesByCountry(selectedCountry, page, filters);
        } else if (selectedYear) {
          response = await api.getMoviesByYear(selectedYear, page, filters);
        } else {
          response = await api.getRecentlyUpdated(page);
        }

        if (response) {
          if (page === 1) {
            setMovies(response.items);
          } else {
            setMovies((prev) => {
              const ids = new Set(prev.map(m => m._id));
              const uniqueNewItems = response.items.filter(m => !ids.has(m._id));
              return [...prev, ...uniqueNewItems];
            });
          }
          setTotalItems(response.pagination?.totalItems ?? 0);
          setTotalPages(response.pagination?.totalPages || 5);
        }
      } catch (err) {
        console.error('Failed to query filter grid listings:', err);
        setError('Connection interrupted. Please try re-applying filters or search terms.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchCatalog();
  }, [page, keywordParam, typeParam, selectedGenre, selectedCountry, selectedYear, sortField, sortType]);

  const handleApplyFilters = () => {
    // Write changes back to URL to preserve back button states
    let query = '?';
    if (keywordParam) query += `keyword=${encodeURIComponent(keywordParam)}&`;
    if (typeParam) query += `type=${typeParam}&`;
    if (selectedGenre) query += `genre=${selectedGenre}&`;
    if (selectedCountry) query += `country=${selectedCountry}&`;
    if (selectedYear) query += `year=${selectedYear}&`;

    router.push(`/search${query.slice(0, -1)}`);
  };

  const handleClearFilters = () => {
    setSelectedGenre('');
    setSelectedCountry('');
    setSelectedYear('');
    setSortField('modified.time');
    setSortType('desc');
    router.push('/search');
  };

  const getPageTitle = () => {
    if (keywordParam) return `Results for "${keywordParam}"`;
    if (typeParam) {
      if (typeParam === 'phim-le') return 'Featured Movies';
      if (typeParam === 'phim-bo') return 'Dramas & Series';
      if (typeParam === 'hoat-hinh') return 'Anime & Animation';
      if (typeParam === 'tv-shows') return 'TV Shows';
    }
    if (selectedGenre && genres.length > 0) {
      const g = genres.find(x => x.slug === selectedGenre);
      if (g) return `Category: ${g.name}`;
    }
    if (selectedCountry && countries.length > 0) {
      const c = countries.find(x => x.slug === selectedCountry);
      if (c) return `Country: ${c.name}`;
    }
    if (selectedYear) return `Year: ${selectedYear}`;
    return 'Browse Full Catalog';
  };

  return (
    <div className="relative min-h-screen bg-cinema-bg text-zinc-100 select-none pb-20 md:pb-0">
      <Header />

      <main className="w-full pt-24 max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-8 space-y-8">
        
        {/* Page title and count */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-4">
          <div className="flex items-center space-x-3">
            <Grid className="text-[#E2B646] w-6 h-6" />
            <h1 className="font-serif font-black text-2xl sm:text-3xl tracking-tight text-white uppercase italic">
              {getPageTitle()}
            </h1>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
            {totalItems} Titles Cataloged
          </span>
        </div>

        {/* Filters Panel */}
        <div className="p-5 bg-black/40 border border-zinc-850 rounded-none space-y-4">
          <div className="flex items-center space-x-2 text-xs font-serif font-bold text-[#E2B646] italic tracking-wider">
            <SlidersHorizontal size={14} className="animate-pulse" />
            <span>FILTER ENGINE DECK</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Genre filter */}
            <div className="flex flex-col space-y-1.5">
              <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">Genre</span>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 rounded-none px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-[#E2B646] transition-colors cursor-pointer"
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.slug}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Country filter */}
            <div className="flex flex-col space-y-1.5">
              <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">Country</span>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 rounded-none px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-[#E2B646] transition-colors cursor-pointer"
              >
                <option value="">All Countries</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Year filter */}
            <div className="flex flex-col space-y-1.5">
              <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">Release Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 rounded-none px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-[#E2B646] transition-colors cursor-pointer"
              >
                <option value="">All Years</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Sorting field */}
            <div className="flex flex-col space-y-1.5">
              <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">Sort Order</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-850 rounded-none px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-[#E2B646] transition-colors cursor-pointer"
              >
                <option value="modified.time">Recently Updated</option>
                <option value="year">Release Year</option>
                <option value="_id">Database ID</option>
              </select>
            </div>

            {/* Actions triggers */}
            <div className="flex items-end gap-2 col-span-2 md:col-span-1">
              <button
                onClick={handleApplyFilters}
                className="flex-1 py-2.5 bg-[#E2B646] text-black rounded-none text-xs font-serif font-black uppercase tracking-widest hover:bg-white hover:glow-gold hover:opacity-95 transition-all cursor-pointer"
              >
                Apply
              </button>
              <button
                onClick={handleClearFilters}
                className="p-3 bg-zinc-900 hover:bg-zinc-850 rounded-none text-zinc-400 border border-zinc-850 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                title="Reset Filters"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Movies Grid */}
        {loading ? (
          /* Skeletons */
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="aspect-[9/14] w-full bg-zinc-950 border border-zinc-900 animate-pulse rounded-none" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-[#E2B646] mx-auto mb-3 animate-bounce" />
            <h4 className="font-serif font-black italic text-lg text-white">Grid Fetch Failed</h4>
            <p className="text-xs text-zinc-500 font-sans max-w-sm mx-auto mt-1 leading-relaxed">{error}</p>
          </div>
        ) : movies.length > 0 ? (
          <div className="space-y-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 justify-items-center">
              {movies.map((movie) => (
                <MovieCard key={movie._id} movie={movie} />
              ))}
            </div>

            {/* Load More trigger */}
            {page < totalPages && (
              <div className="flex items-center justify-center pt-8 border-t border-zinc-900/40">
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={loadingMore}
                  className="flex items-center space-x-2 px-8 py-3 bg-zinc-900/40 border border-zinc-850 hover:border-[#E2B646] rounded-none text-zinc-400 hover:text-white font-serif text-xs font-bold tracking-widest uppercase hover:glow-gold hover:scale-105 transition-all cursor-pointer"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-3.5 h-3.5 border-t border-[#E2B646] rounded-none animate-spin" />
                      <span>Syncing catalog...</span>
                    </>
                  ) : (
                    <span>LOAD MORE</span>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-32 space-y-4">
            <Film className="w-12 h-12 text-zinc-800 mx-auto animate-pulse" />
            <div>
              <h4 className="font-serif font-black italic text-lg text-white">No Titles Matched</h4>
              <p className="text-xs text-zinc-600 font-sans mt-1">Try re-applying filters or adjust your search inputs</p>
            </div>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2 bg-zinc-900 border border-zinc-850 rounded-none hover:border-[#E2B646] text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-cinema-bg">
        <div className="w-10 h-10 border-t-2 border-r-2 border-[#E2B646] rounded-none animate-spin" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

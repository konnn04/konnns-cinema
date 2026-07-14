'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Info, Flame, Film, Tv, Sparkles } from 'lucide-react';
import { api, MovieItem, resolveImageUrl, ANIME_PSEUDO_GENRE } from '@/lib/api';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import MovieRow from '@/components/MovieRow';
import PosterImage from '@/components/PosterImage';
import SplashIntro from '@/components/SplashIntro';
import OnboardingModal from '@/components/OnboardingModal';
import WatchPartySection from '@/components/home/WatchPartySection';
import { useLanguage } from '@/hooks/useLanguage';

export default function HomePage() {
  const { t, language, translateGenre, translateMovieTitle } = useLanguage();
  
  const [showSplash, setShowSplash] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const [featuredMovies, setFeaturedMovies] = useState<MovieItem[]>([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState<MovieItem[]>([]);
  const [moviesList, setMoviesList] = useState<MovieItem[]>([]);
  const [seriesList, setSeriesList] = useState<MovieItem[]>([]);
  const [animeList, setAnimeList] = useState<MovieItem[]>([]);
  const [personalizedRow, setPersonalizedRow] = useState<{ title: string; items: MovieItem[] } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const loadAllMovieData = useCallback(async () => {
    setLoading(true);
    try {
      const favoriteGenres = usePreferencesStore.getState().favoriteGenres;
      const primaryGenreSlug = favoriteGenres.length > 0 ? favoriteGenres[0] : null;

      const [movies, series, anime] = await Promise.all([
        api.getMoviesByType('phim-le', 1),
        api.getMoviesByType('phim-bo', 1),
        api.getMoviesByType('hoat-hinh', 1),
      ]);

      setMoviesList(movies.items);
      setSeriesList(series.items);
      setAnimeList(anime.items);

      if (primaryGenreSlug === ANIME_PSEUDO_GENRE.slug) {
        setFeaturedMovies(anime.items.slice(0, 5));
      } else if (primaryGenreSlug) {
        try {
          const genreMovies = await api.getMoviesByGenre(primaryGenreSlug, 1);
          setFeaturedMovies(genreMovies.items.slice(0, 5));
        } catch {
          const recent = await api.getRecentlyUpdated(1);
          setFeaturedMovies(recent.items.slice(0, 5));
        }
      } else {
        const recent = await api.getRecentlyUpdated(1);
        setFeaturedMovies(recent.items.slice(0, 5));
      }

      const recent = await api.getRecentlyUpdated(1);
      setRecentlyUpdated(recent.items);

      if (primaryGenreSlug) {
        const personalizedLabel = t('home.personalized');

        if (primaryGenreSlug === ANIME_PSEUDO_GENRE.slug) {
          setPersonalizedRow({
            title: `${personalizedLabel}: ${translateGenre(ANIME_PSEUDO_GENRE.name)}`,
            items: anime.items,
          });
        } else {
          try {
            const genreMovies = await api.getMoviesByGenre(primaryGenreSlug, 1);
            const allGenres = await api.getGenres();
            const genreObj = allGenres.find(g => g.slug === primaryGenreSlug);
            const title = genreObj ? `${personalizedLabel}: ${translateGenre(genreObj.name)}` : `${personalizedLabel}: ${primaryGenreSlug}`;
            setPersonalizedRow({
              title,
              items: genreMovies.items,
            });
          } catch {
          }
        }
      }
    } catch (err) {
      console.error('Failed to load homepage movie lists:', err);
    } finally {
      setLoading(false);
    }
  }, [language, translateGenre]);

  const revealDashboard = useCallback(() => {
    setShowDashboard(true);
    loadAllMovieData();
  }, [loadAllMovieData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const splashCompleted = localStorage.getItem('splash_completed') === 'true';
      const onboardingDone = usePreferencesStore.getState().onboardingCompleted;

      if (onboardingDone && splashCompleted) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        revealDashboard();
      } else if (!splashCompleted) {
        setShowSplash(true);
      } else {
        setShowOnboarding(true);
      }
    }
  }, [revealDashboard]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('splash_completed', 'true');
    }
    const onboardingDone = usePreferencesStore.getState().onboardingCompleted;
    if (!onboardingDone) {
      setShowOnboarding(true);
    } else {
      revealDashboard();
    }
  }, [revealDashboard]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    revealDashboard();
  }, [revealDashboard]);

  useEffect(() => {
    if (featuredMovies.length === 0 || loading) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredMovies, loading]);

  const activeHero = featuredMovies[currentHeroIndex];

  return (
    <div className="relative min-h-screen bg-cinema-bg overflow-x-hidden">
      {}
      {showSplash && <SplashIntro onComplete={handleSplashComplete} />}
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      {}
      {showDashboard && (
        <div className="pb-20 md:pb-0">
          <Header />

          {}
          <main className="w-full">
            {loading ? (
              <div className="w-full">
                {}
                <div className="relative w-full aspect-[21/9] min-h-[480px] bg-zinc-950 animate-pulse flex flex-col justify-end p-8 sm:p-16">
                  <div className="w-32 h-6 bg-zinc-900 rounded-lg mb-4" />
                  <div className="w-2/3 sm:w-1/2 h-12 bg-zinc-900 rounded-xl mb-3" />
                  <div className="w-1/2 sm:w-1/3 h-4 bg-zinc-900 rounded-md mb-6" />
                  <div className="flex space-x-4">
                    <div className="w-36 h-12 bg-zinc-900 rounded-full" />
                    <div className="w-36 h-12 bg-zinc-900 rounded-full" />
                  </div>
                </div>

                {}
                {[1, 2, 3].map((row) => (
                  <div key={row} className="px-4 sm:px-8 md:px-12 py-8 space-y-4 animate-pulse">
                    <div className="w-48 h-8 bg-zinc-900 rounded-lg" />
                    <div className="flex space-x-4 overflow-hidden">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex-none w-[140px] sm:w-[170px] md:w-[190px] aspect-[9/14] bg-zinc-900 rounded-2xl" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full">
                {}
                {activeHero && (
                  <div className="relative w-full aspect-[16/9] md:aspect-[21/9] min-h-[460px] max-h-[800px] overflow-hidden bg-black">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeHero._id}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 w-full h-full"
                      >
                        <PosterImage
                          src={resolveImageUrl(activeHero.thumb_url || activeHero.poster_url)}
                          alt={activeHero.name}
                          priority
                          className="object-cover object-top filter brightness-75 contrast-105"
                          referrerPolicy="no-referrer"
                          iconSize={40}
                        />
                      </motion.div>
                    </AnimatePresence>

                    {}
                    <div className="absolute right-6 sm:right-12 bottom-20 z-20 flex space-x-3">
                      {featuredMovies.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentHeroIndex(idx)}
                          className={`w-8 h-[2px] transition-all duration-300 cursor-pointer ${
                            idx === currentHeroIndex ? 'bg-[#E2B646]' : 'bg-white/20 hover:bg-white/40'
                          }`}
                        />
                      ))}
                    </div>

                    {}
                    <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/25 to-black/60 pointer-events-none" />
                    <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-cinema-bg via-cinema-bg/10 to-transparent pointer-events-none hidden md:block" />

                    {}
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12 md:p-16 flex flex-col justify-end h-full z-10">
                      <div className="max-w-2xl space-y-4">
                        {}
                        <div className="flex items-center space-x-3 text-xs font-mono font-bold tracking-wide text-[#E2B646]">
                          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-none bg-black/80 border border-[#E2B646]/30 font-serif text-[9px] tracking-[0.15em] uppercase text-[#E2B646]">
                            <Flame size={11} className="animate-bounce" />
                            <span>{t('home.featured')}</span>
                          </span>
                          <span className="text-zinc-500">&bull;</span>
                          <span className="text-zinc-300">{activeHero.year}</span>
                          {activeHero.quality && (
                            <>
                              <span className="text-zinc-500">&bull;</span>
                              <span className="px-2 py-0.5 rounded-none bg-zinc-900 border border-zinc-800 text-[9px] font-mono tracking-widest text-white uppercase">{activeHero.quality}</span>
                            </>
                          )}
                        </div>

                        {}
                        <h1 className="font-serif font-black italic text-3xl sm:text-5xl md:text-6xl lg:text-7.5xl text-white tracking-tight leading-none select-text drop-shadow-md">
                          {translateMovieTitle(activeHero)}
                        </h1>

                        <p className="font-sans text-xs sm:text-sm text-zinc-300 font-medium select-text drop-shadow max-w-xl line-clamp-3 leading-relaxed">
                          {activeHero.origin_name} &bull; {t('home.hero_desc')}
                        </p>

                        {}
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                          <Link href={`/movie/${activeHero.slug}`}>
                            <button className="flex items-center space-x-2.5 px-8 py-3.5 bg-[#E2B646] hover:bg-white text-black font-serif text-xs font-black tracking-[0.2em] uppercase hover:glow-gold transition-all duration-300 cursor-pointer rounded-none">
                              <Play size={13} className="fill-current" />
                              <span>{t('movie.watch_now')}</span>
                            </button>
                          </Link>

                          <Link href={`/movie/${activeHero.slug}`}>
                            <button className="flex items-center space-x-2.5 px-8 py-3.5 bg-transparent border border-white/20 hover:border-white text-white font-serif text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-sm transition-all duration-300 cursor-pointer rounded-none">
                              <Info size={13} />
                              <span>{t('home.more_info')}</span>
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {}
                <div className="relative z-20 space-y-6 md:-mt-12 bg-gradient-to-b from-transparent via-cinema-bg to-cinema-bg pt-10">
                  <WatchPartySection />

                  {}
                  {personalizedRow && (
                    <MovieRow
                      title={personalizedRow.title}
                      movies={personalizedRow.items}
                      icon={<Sparkles className="w-5 h-5 text-[#E2B646]" />}
                    />
                  )}

                  {}
                  <MovieRow
                    title={t('home.recently_updated')}
                    movies={recentlyUpdated}
                    icon={<Flame className="w-5 h-5 text-brand-orange" />}
                  />

                  <MovieRow
                    title={t('home.featured_movies')}
                    movies={moviesList}
                    icon={<Film className="w-5 h-5 text-[#E2B646]" />}
                  />

                  <MovieRow
                    title={t('home.series')}
                    movies={seriesList}
                    icon={<Tv className="w-5 h-5 text-brand-orange" />}
                  />

                  <MovieRow
                    title={t('home.anime')}
                    movies={animeList}
                    icon={<Sparkles className="w-5 h-5 text-[#E2B646]" />}
                  />
                </div>
              </div>
            )}
          </main>

          <Footer />
          <MobileNav />
        </div>
      )}
    </div>
  );
}

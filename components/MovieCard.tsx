'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Heart, Calendar, Info, X, Loader2, ShieldAlert } from 'lucide-react';
import { api, MovieItem, resolveImageUrl, MovieDetail } from '@/lib/api';
import { isAdultMovie, isAdultVerified, setAdultVerified, isAdultUnblurEnabled } from '@/lib/adult';
import { useFavoritesStore } from '@/lib/stores/useFavoritesStore';
import { useLanguage } from '@/hooks/useLanguage';
import AdultConfirmModal from './AdultConfirmModal';
import MovieSynopsis from './MovieSynopsis';
import PosterImage from './PosterImage';

interface MovieCardProps {
  movie: MovieItem;
  pathImage?: string;
  onFavoriteChange?: () => void;
}

export default function MovieCard({ movie, pathImage, onFavoriteChange }: MovieCardProps) {
  const { language, t, translateGenre, translateCountry, translateMovieTitle, translateStatus } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isFavorited = useFavoritesStore((s) => s.isFavorited(movie.slug));
  const toggleFavoriteInStore = useFavoritesStore((s) => s.toggleFavorite);

  const isAdult = isAdultMovie(movie);
  const [adultUnblurred, setAdultUnblurred] = useState(false);
  const [showAdultGate, setShowAdultGate] = useState(false);
  const isCensored = isAdult && !adultUnblurred;

  const [detailedMovie, setDetailedMovie] = useState<MovieDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      if (isAdult) {
        setAdultUnblurred(isAdultUnblurEnabled());
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [movie.slug, isAdult]);

  const openDetailModal = () => {
    if (isAdult && !isAdultVerified()) {
      setShowAdultGate(true);
      return;
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (isModalOpen && movie.slug) {
      Promise.resolve().then(() => {
        setLoadingDetail(true);
      });
      api.getMovieDetail(movie.slug)
        .then((res) => {
          if (res && res.movie) {
            setDetailedMovie(res.movie);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch detailed movie info:', err);
        })
        .finally(() => {
          setLoadingDetail(false);
        });
    }
  }, [isModalOpen, movie.slug]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteInStore(movie);
    if (onFavoriteChange) onFavoriteChange();
  };

  const getStatusLabel = () => {
    const current = movie.episode_current?.toLowerCase() || '';
    if (current.includes('full') || movie.status === 'completed') {
      return { text: t('movie.status_completed'), style: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    }
    if (current.includes('coming') || movie.status === 'coming') {
      return { text: t('movie.status_coming'), style: 'bg-brand-red/20 text-brand-red border-brand-red/30 animate-pulse' };
    }
    return {
      text: movie.episode_current ? translateStatus(movie.episode_current) : t('movie.status_airing'),
      style: 'bg-brand-orange/20 text-[#E2B646] border-[#E2B646]/30'
    };
  };

  const status = getStatusLabel();
  const imageUrl = resolveImageUrl( movie.poster_url || movie.thumb_url, pathImage);

  return (
    <>
      <div
        id={`movie-card-${movie._id}`}
        className="relative flex-none w-[140px] sm:w-[170px] md:w-[190px] group select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link href={`/movie/${movie.slug}`}>
          <div className="relative aspect-[9/14] w-full rounded-none overflow-hidden bg-zinc-900 border border-zinc-800/80 transition-all duration-300 group-hover:border-[#E2B646] group-hover:shadow-lg group-hover:shadow-[#E2B646]/10 cursor-pointer">
            
            {}
            <PosterImage
              src={imageUrl}
              alt={movie.name}
              sizes="(max-width: 768px) 150px, 200px"
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isCensored ? 'blur-xl scale-110' : ''}`}
              referrerPolicy="no-referrer"
              priority={false}
            />

            {}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/30 opacity-80 group-hover:opacity-90 transition-opacity" />

            {}
            {isCensored && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/40">
                <ShieldAlert size={22} className="text-red-500" />
                <span className="px-2 py-0.5 text-[9px] font-mono font-black tracking-widest bg-red-600 text-white">18+</span>
              </div>
            )}

            {}
            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
              {movie.quality && (
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider rounded-none bg-black/80 text-[#E2B646] border border-[#E2B646]/30">
                  {movie.quality}
                </span>
              )}
            </div>

            <div className="absolute top-2 right-2 z-10">
              <span className={`px-2 py-0.5 text-[9px] font-sans font-semibold tracking-wide rounded-none border ${status.style}`}>
                {status.text}
              </span>
            </div>

            {}
            <div className="absolute bottom-0 left-0 right-0 p-3 pb-4 flex flex-col justify-end z-10">
              <h3 className="font-serif font-black italic text-xs sm:text-sm text-zinc-100 line-clamp-2 leading-tight group-hover:text-[#E2B646] transition-colors">
                {translateMovieTitle(movie)}
              </h3>
              <p className="font-sans text-[10px] text-zinc-500 truncate mt-1">
                {movie.origin_name}
              </p>
            </div>

            {}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openDetailModal();
              }}
              className="absolute bottom-3 right-3 p-1.5 bg-zinc-950/85 backdrop-blur-sm hover:bg-[#E2B646] rounded-none text-zinc-400 hover:text-black border border-zinc-800/80 transition-all hover:scale-110 z-20 cursor-pointer"
              title={t('movie.details')}
            >
              <Info size={14} />
            </button>

            {}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
                  className="absolute inset-x-0 bottom-0 top-[25%] bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 p-3 z-10 hidden md:flex flex-col justify-between"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[9px] text-[#E2B646] flex items-center space-x-1 font-bold">
                        <Calendar size={10} />
                        <span>{movie.year}</span>
                      </span>
                      {isMounted && (
                        <button
                          onClick={toggleFavorite}
                          className="p-1 hover:bg-zinc-900 rounded-none text-zinc-400 hover:text-[#E2B646] transition-all cursor-pointer"
                          title={isFavorited ? t('movie.pinned') : t('movie.pin')}
                        >
                          <Heart size={12} className={isFavorited ? 'fill-[#E2B646] text-[#E2B646]' : ''} />
                        </button>
                      )}
                    </div>

                    <h4 className="font-serif font-bold italic text-xs text-white leading-tight truncate">
                      {translateMovieTitle(movie)}
                    </h4>
                    <p className="font-sans text-[9px] text-zinc-500 truncate leading-none mb-1">
                      {movie.origin_name}
                    </p>

                    {}
                    {movie.category && movie.category.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-h-[30px] overflow-hidden">
                        {movie.category.slice(0, 2).map((cat) => (
                          <span key={cat.id} className="px-1 py-0.5 rounded-none text-[8px] bg-zinc-900 text-zinc-400 font-sans uppercase tracking-widest border border-white/5">
                            {translateGenre(cat.name)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div 
                    className="flex items-center gap-2 pt-2 border-t border-zinc-900 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDetailModal();
                    }}
                  >
                    <div className="w-full flex items-center justify-center space-x-1 py-1.5 bg-[#E2B646] rounded-none text-black font-serif text-[10px] font-bold tracking-widest uppercase hover:bg-white transition-all">
                      <Info size={10} className="fill-current text-black" />
                      <span>{t('movie.details')}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Link>
      </div>

      {}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            {}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {}
            <motion.div
              initial={{ y: '60%', opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '60%', opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full md:max-w-2xl bg-zinc-950 border-t md:border border-zinc-800 p-6 md:p-8 rounded-none max-h-[85vh] md:max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl glow-gold z-10"
            >
              {}
              <div className="w-12 h-1 bg-zinc-850 mx-auto mb-6 md:hidden" />

              {}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-zinc-900 rounded-none text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer transition-all hover:bg-zinc-850"
              >
                <X size={16} />
              </button>

              {}
              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                <div className="relative aspect-[9/14] w-[130px] sm:w-[150px] rounded-none overflow-hidden border border-zinc-800 bg-zinc-900 flex-none mx-auto sm:mx-0">
                  <PosterImage
                    src={imageUrl}
                    alt={movie.name}
                    className={`object-cover ${isCensored ? 'blur-lg scale-110' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                  {isCensored && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <ShieldAlert size={20} className="text-red-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <span className={`inline-block px-2 py-0.5 text-[9px] font-sans font-semibold tracking-wide rounded-none border mb-2 ${status.style}`}>
                    {status.text}
                  </span>

                  <h3 className="font-serif font-black italic text-xl sm:text-2xl text-white leading-tight">
                    {translateMovieTitle(movie)}
                  </h3>
                  <p className="font-sans text-sm text-zinc-400 mt-1">{movie.origin_name}</p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-xs text-zinc-400 font-mono">
                    <span className="flex items-center gap-1.5 text-[#E2B646]">
                      <Calendar size={14} />
                      {movie.year}
                    </span>
                    {movie.quality && (
                      <span className="px-1.5 py-0.5 rounded-none bg-zinc-900 text-[#E2B646] border border-zinc-850 font-bold">
                        {movie.quality}
                      </span>
                    )}
                    {movie.lang && (
                      <span className="px-1.5 py-0.5 rounded-none bg-zinc-900 text-zinc-300 border border-zinc-850">
                        {movie.lang}
                      </span>
                    )}
                  </div>

                  {}
                  <div className="mt-4 space-y-1.5 text-xs text-zinc-400 border-t border-zinc-900 pt-4">
                    <div>
                      <span className="text-zinc-500 font-mono uppercase text-[10px] mr-2">{t('movie.director')}:</span>
                      <span className="text-zinc-300 font-sans">
                        {loadingDetail ? (
                          <span className="animate-pulse">{t('common.loading')}</span>
                        ) : detailedMovie?.director && detailedMovie.director.length > 0 ? (
                          detailedMovie.director.join(', ')
                        ) : (
                          t('common.not_available')
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-mono uppercase text-[10px] mr-2">{t('movie.actors')}:</span>
                      <span className="text-zinc-300 font-sans line-clamp-2">
                        {loadingDetail ? (
                          <span className="animate-pulse">Loading...</span>
                        ) : detailedMovie?.actor && detailedMovie.actor.length > 0 ? (
                          detailedMovie.actor.join(', ')
                        ) : (
                          'N/A'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {}
              <div className="mb-6 border-t border-zinc-900 pt-4">
                <h4 className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2">{t('movie.synopsis')}</h4>
                <div className="text-xs text-zinc-300 font-sans leading-relaxed max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                  {loadingDetail ? (
                    <div className="flex items-center space-x-2 text-zinc-500 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E2B646]" />
                      <span>{t('movie.syncing_synopsis')}</span>
                    </div>
                  ) : detailedMovie?.content ? (
                    <MovieSynopsis html={detailedMovie.content} />
                  ) : (
                    <p className="text-zinc-500 italic">{t('movie.no_description')}</p>
                  )}
                </div>
              </div>

              {}
              {movie.category && movie.category.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2">{t('movie.genres')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {movie.category.map((cat) => (
                      <Link key={cat.id} href={`/category/${cat.slug}`} onClick={() => setIsModalOpen(false)}>
                        <span className="px-2.5 py-1 rounded-none text-xs bg-zinc-900 border border-zinc-850 text-zinc-300 font-sans hover:border-[#E2B646] hover:text-white transition-colors">
                          {translateGenre(cat.name)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-6">
                <Link href={`/movie/${movie.slug}`} className="col-span-1" onClick={() => setIsModalOpen(false)}>
                  <button className="w-full flex items-center justify-center space-x-2 py-3 bg-[#E2B646] rounded-none text-black font-serif text-xs font-black uppercase tracking-widest hover:bg-white transition-all cursor-pointer">
                    <Play size={12} className="fill-current" />
                    <span>{t('movie.watch_now')}</span>
                  </button>
                </Link>

                <button
                  onClick={(e) => {
                    toggleFavorite(e);
                  }}
                  className={`col-span-1 flex items-center justify-center space-x-2 py-3 border rounded-none font-sans text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                    isFavorited
                      ? 'border-[#E2B646]/30 bg-[#E2B646]/10 text-[#E2B646]'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Heart size={12} className={isFavorited ? 'fill-[#E2B646]' : ''} />
                  <span>{isFavorited ? t('movie.pinned') : t('movie.pin')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showAdultGate && (
        <AdultConfirmModal
          onConfirm={() => {
            setAdultVerified();
            setShowAdultGate(false);
            setIsModalOpen(true);
          }}
          onCancel={() => setShowAdultGate(false)}
        />
      )}
    </>
  );
}

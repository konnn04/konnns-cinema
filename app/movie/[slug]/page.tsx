'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Bell, BellOff, Share2, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { api, MovieDetail, ServerEpisode, resolveImageUrl } from '@/lib/api';
import { isAdultMovie, isAdultVerified, setAdultVerified } from '@/lib/adult';
import { searchAnime, AnimeInfo, formatAnimeEpisodes, translateAnimeStatus, translateAnimeFormat, formatNextAiringTime } from '@/lib/anime';
import { useFavoritesStore } from '@/lib/stores/useFavoritesStore';
import { useReminderStore } from '@/lib/stores/useReminderStore';
import { useWatchHistoryStore } from '@/lib/stores/useWatchHistoryStore';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import MovieRow from '@/components/MovieRow';
import AdultConfirmModal from '@/components/AdultConfirmModal';
import MovieSynopsis from '@/components/MovieSynopsis';
import PosterImage from '@/components/PosterImage';
import CinemaTicket from '@/components/movie/CinemaTicket';
import CastCrewPanel from '@/components/movie/CastCrewPanel';
import TrailerEmbed from '@/components/movie/TrailerEmbed';
import EpisodeGrid from '@/components/movie/EpisodeGrid';

interface MoviePageProps {
  params: Promise<{ slug: string }>;
}

export default function MovieDetailPage({ params }: MoviePageProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { slug } = use(params);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<ServerEpisode[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [activeServerIdx, setActiveServerIdx] = useState(0);

  const [isTearing, setIsTearing] = useState(false);
  const [isStamped, setIsStamped] = useState(false);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);

  const isFavorited = useFavoritesStore((s) => (movie ? s.isFavorited(movie.slug) : false));
  const toggleFavoriteInStore = useFavoritesStore((s) => s.toggleFavorite);
  const isReminded = useReminderStore((s) => (movie ? s.isReminded(movie.slug) : false));
  const toggleReminderInStore = useReminderStore((s) => s.toggleReminder);
  const historyEntry = useWatchHistoryStore((s) => (movie ? s.getBySlug(movie.slug) : undefined));
  const resumeEpisode = historyEntry
    ? { name: historyEntry.episodeName, slug: historyEntry.episodeSlug, progress: historyEntry.progress || 0 }
    : null;

  const [adultForceVerified, setAdultForceVerified] = useState(false);
  const adultGatePassed = adultForceVerified || (!!movie && isAdultVerified());

  const handleAdultGateConfirm = () => {
    setAdultVerified();
    setAdultForceVerified(true);
  };

  useEffect(() => {
    const loadMovieDetail = async () => {
      setLoading(true);
      try {
        const res = await api.getMovieDetail(slug);
        if (res.status && res.movie) {
          setMovie(res.movie);
          setEpisodes(res.episodes || []);

          if (res.movie.category && res.movie.category.length > 0) {
            const similar = await api.getMoviesByGenre(res.movie.category[0].slug, 1);
            setRecommended(similar.items.filter((item: any) => item.slug !== res.movie.slug).slice(0, 10));
          }

          if (res.movie.type === 'hoathinh' && res.movie.origin_name) {
            searchAnime(res.movie.origin_name).then(setAnimeInfo);
          }
        } else {
          setNotFoundFlag(true);
        }
      } catch (err) {
        console.error('Failed to load movie details page:', err);
        setNotFoundFlag(true);
      } finally {
        setLoading(false);
      }
    };

    loadMovieDetail();
  }, [slug]);

  if (notFoundFlag) {
    notFound();
  }

  const toggleFavorite = () => {
    if (!movie) return;
    toggleFavoriteInStore(movie);
  };

  const toggleReminder = () => {
    if (!movie) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    toggleReminderInStore(movie);
  };

  const handleTicketTearAndWatch = (episodeSlug?: string, episodeName?: string) => {
    if (!movie || episodes.length === 0) return;

    const activeServer = episodes[activeServerIdx];
    const serverData = activeServer?.server_data || [];
    if (serverData.length === 0) return;

    const targetEp = episodeSlug 
      ? serverData.find(e => e.slug === episodeSlug) || serverData[0]
      : serverData[0];
    
    const epSlug = targetEp.slug;
    const epName = targetEp.name;

    setIsTearing(true);
    
    setTimeout(() => {
      setIsStamped(true);
    }, 200);

    setTimeout(() => {
      useWatchHistoryStore.getState().upsert({
        _id: movie._id,
        name: movie.name,
        slug: movie.slug,
        origin_name: movie.origin_name,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        year: movie.year,
        quality: movie.quality,
        episodeSlug: epSlug,
        episodeName: epName,
        progress: resumeEpisode?.slug === epSlug ? resumeEpisode.progress : 0,
        timestamp: historyEntry?.episodeSlug === epSlug ? historyEntry.timestamp : 0,
        updatedAt: new Date().toISOString(),
        category: movie.category,
      });

      setIsTearing(false);
      setIsStamped(false);
      router.push(`/watch/${movie.slug}/${epSlug}?server=${activeServerIdx}`);
    }, 800);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('Movie link copied to clipboard!');
    }
  };

  const categoriesList = movie?.category || [];
  const primaryGenre = categoriesList[0]?.name || 'Cinema';
  
  const getCountdownString = () => {
    if (!movie || movie.status === 'completed' || !movie.showtimes) return null;
    return `Updates: ${movie.showtimes}`;
  };

  const countdown = getCountdownString();

  return (
    <div className="relative min-h-screen bg-cinema-bg text-zinc-100 select-none pb-20 md:pb-0">
      <Header />

      {loading ? (
        <div className="w-full pt-24 px-4 sm:px-8 md:px-12 animate-pulse space-y-8">
          <div className="w-full aspect-[21/9] min-h-[360px] bg-zinc-900 rounded-none" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 aspect-[9/14] bg-zinc-900 rounded-none" />
            <div className="col-span-2 space-y-4">
              <div className="w-3/4 h-10 bg-zinc-900 rounded-none" />
              <div className="w-1/2 h-6 bg-zinc-900 rounded-none" />
              <div className="w-full h-32 bg-zinc-900 rounded-none" />
            </div>
          </div>
        </div>
      ) : movie && isAdultMovie(movie) && !adultGatePassed ? (
        <div className="pt-24 min-h-screen flex items-center justify-center px-4">
          <AdultConfirmModal
            onConfirm={handleAdultGateConfirm}
            onCancel={() => router.push('/')}
          />
        </div>
      ) : movie ? (
        <main className="w-full relative">

          {}
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] min-h-[320px] max-h-[620px] overflow-hidden">
            <PosterImage
              src={resolveImageUrl(movie.thumb_url || movie.poster_url)}
              alt={movie.name}
              priority
              className="object-cover object-top brightness-[0.25] contrast-105 scale-105"
              referrerPolicy="no-referrer"
              iconSize={40}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-transparent to-black/45" />
          </div>

          {}
          <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 relative -mt-32 md:-mt-48 z-10 space-y-12 pb-16">
            
            {}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {}
              <div className="col-span-1 lg:col-span-4 flex flex-col items-center lg:items-stretch space-y-4">
                <div className="relative aspect-[9/13] w-[220px] sm:w-[260px] lg:w-full rounded-none overflow-hidden border border-zinc-800/80 shadow-2xl bg-zinc-950 flex-none glow-gold">
                  <PosterImage
                    src={resolveImageUrl(movie.poster_url || movie.thumb_url)}
                    alt={movie.name}
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {movie.quality && (
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-none text-[10px] font-mono font-bold tracking-wider bg-black/90 text-[#E2B646] border border-[#E2B646]/30 animate-pulse">
                      {movie.quality}
                    </span>
                  )}
                </div>

                {}
                <div className="flex items-center gap-3 w-full max-w-[260px] lg:max-w-none">
                  <button
                    onClick={toggleFavorite}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 border rounded-none font-sans text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                      isFavorited
                        ? 'border-[#E2B646]/30 bg-[#E2B646]/10 text-[#E2B646]'
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <Heart size={14} className={isFavorited ? 'fill-[#E2B646]' : ''} />
                    <span>{isFavorited ? 'Pinned' : 'Pin Title'}</span>
                  </button>

                  <button
                    onClick={toggleReminder}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 border rounded-none font-sans text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                      isReminded
                        ? 'border-[#E2B646]/30 bg-[#E2B646]/10 text-[#E2B646] shadow-md shadow-[#E2B646]/5'
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {isReminded ? <BellOff size={14} /> : <Bell size={14} />}
                    <span>{isReminded ? 'Unremind' : 'Remind Me'}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-3 bg-zinc-900/30 border border-zinc-850 hover:border-zinc-700 rounded-none text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Share Movie"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>

              {}
              <div className="col-span-1 lg:col-span-8 space-y-6">
                
                <CinemaTicket
                  movie={movie}
                  isStamped={isStamped}
                  isTearing={isTearing}
                  resumeEpisode={resumeEpisode}
                  onWatchClick={() => handleTicketTearAndWatch(resumeEpisode?.slug)}
                />

                {}
                <div className="flex items-start space-x-2 p-3 rounded-none bg-zinc-950/40 border border-zinc-850 text-[10px] text-zinc-500 leading-relaxed">
                  <AlertCircle size={14} className="text-zinc-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Ticket stub:</strong> {t('movie.ticket_stub')}
                  </p>
                </div>

                {}
                {countdown && (
                  <div className="p-4 rounded-none bg-[#E2B646]/5 border border-[#E2B646]/20 flex items-center space-x-3 text-sm text-[#E2B646]">
                    <Clock size={16} className="animate-pulse shrink-0" />
                    <div>
                      <h4 className="font-serif font-black italic tracking-wide">{t('movie.countdown')}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{countdown}</p>
                    </div>
                  </div>
                )}

                {}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 font-sans border-b border-zinc-900 pb-3">
                    <span className="font-mono text-zinc-500">{t('movie.directed_by')}</span>
                    <span className="font-semibold text-zinc-200">{movie.director?.join(', ') || 'Unknown'}</span>
                  </div>

                  <MovieSynopsis
                    html={movie.content}
                    className="text-zinc-300 text-xs sm:text-sm leading-relaxed text-justify font-sans select-text"
                  />

                  {}
                  {movie.category && movie.category.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {movie.category.map((cat) => (
                        <Link key={cat.id} href={`/category/${cat.slug}`}>
                          <span className="px-3 py-1.5 rounded-none text-xs bg-zinc-950/60 border border-zinc-850 hover:border-[#E2B646] hover:text-[#E2B646] text-zinc-300 font-bold uppercase tracking-widest transition-colors">
                            {cat.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Anime Info from AniList */}
                {animeInfo && (
                  <div className="pt-6 border-t border-zinc-900/80 space-y-3">
                    <h4 className="font-serif font-black italic text-sm text-[#E2B646] uppercase tracking-wider">
                      {t('anime.info_title')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {animeInfo.episodes != null && (
                        <div className="p-2.5 bg-zinc-950/40 border border-zinc-900">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">{t('anime.episodes')}</span>
                          <span className="text-xs font-bold text-zinc-200 mt-0.5 block">
                            {animeInfo.episodes > 0 ? animeInfo.episodes : (animeInfo.nextAiringEpisode ? `${animeInfo.nextAiringEpisode.episode - 1}/?` : '?')}
                            {animeInfo.nextAiringEpisode && <span className="text-zinc-500 font-normal ml-1">(+{t('anime.next_episode').toLowerCase()} #{animeInfo.nextAiringEpisode.episode})</span>}
                          </span>
                        </div>
                      )}
                      {animeInfo.status && (
                        <div className="p-2.5 bg-zinc-950/40 border border-zinc-900">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">{t('anime.status')}</span>
                          <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{translateAnimeStatus(animeInfo.status, language)}</span>
                        </div>
                      )}
                      {animeInfo.averageScore != null && (
                        <div className="p-2.5 bg-zinc-950/40 border border-zinc-900">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">{t('anime.score')}</span>
                          <span className="text-xs font-bold text-[#E2B646] mt-0.5 block">{animeInfo.averageScore}%</span>
                        </div>
                      )}
                      {animeInfo.studios.length > 0 && (
                        <div className="p-2.5 bg-zinc-950/40 border border-zinc-900">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">{t('anime.studio')}</span>
                          <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{animeInfo.studios.join(', ')}</span>
                        </div>
                      )}
                      {animeInfo.format && (
                        <div className="p-2.5 bg-zinc-950/40 border border-zinc-900">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">{t('anime.format')}</span>
                          <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{translateAnimeFormat(animeInfo.format, language)}</span>
                        </div>
                      )}
                      {animeInfo.source && (
                        <div className="p-2.5 bg-zinc-950/40 border border-zinc-900">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">{t('anime.source')}</span>
                          <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{animeInfo.source.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {animeInfo.nextAiringEpisode && (
                        <div className="p-2.5 bg-zinc-950/40 border border-[#E2B646]/20 col-span-2 sm:col-span-3 lg:col-span-4">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-[#E2B646] block">{t('anime.next_episode')} #{animeInfo.nextAiringEpisode.episode}</span>
                          <span className="text-xs font-bold text-zinc-200 mt-0.5 block">
                            {formatNextAiringTime(animeInfo.nextAiringEpisode.airingAt, language)}
                          </span>
                        </div>
                      )}
                      {animeInfo.genres.length > 0 && (
                        <div className="p-2.5 bg-zinc-950/40 border border-zinc-900 col-span-2">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">{t('anime.genres')}</span>
                          <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{animeInfo.genres.slice(0, 4).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-zinc-900/80">
              <CastCrewPanel actors={movie.actor || []} />
              {movie.trailer_url && <TrailerEmbed trailerUrl={movie.trailer_url} />}
            </div>

            {episodes.length > 0 && (
              <EpisodeGrid
                episodes={episodes}
                activeServerIdx={activeServerIdx}
                onServerChange={setActiveServerIdx}
                activeEpisodeSlug={resumeEpisode?.slug}
                onEpisodeClick={handleTicketTearAndWatch}
              />
            )}

            {}
            {recommended.length > 0 && (
              <div className="pt-8 border-t border-zinc-900/80">
                <MovieRow
                  title="You Might Also Like"
                  movies={recommended}
                  icon={<Sparkles className="w-5 h-5" />}
                />
              </div>
            )}
          </div>
        </main>
      ) : null}

      <Footer />
      <MobileNav />
    </div>
  );
}

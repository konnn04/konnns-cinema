'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Tv, X } from 'lucide-react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'motion/react';
import { api, MovieDetail, ServerEpisode, ServerData } from '@/lib/api';
import { isAdultMovie, isAdultVerified, setAdultVerified } from '@/lib/adult';
import { searchAnime, AnimeInfo, translateAnimeStatus, translateAnimeFormat, formatNextAiringTime } from '@/lib/anime';
import { useLanguage } from '@/hooks/useLanguage';
import { useWatchHistoryStore } from '@/lib/stores/useWatchHistoryStore';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import AdultConfirmModal from '@/components/AdultConfirmModal';
import MovieSynopsis from '@/components/MovieSynopsis';
import PlayerControlBar from '@/components/player/PlayerControlBar';
import StreamSidebar from '@/components/player/StreamSidebar';
import AutoNextOverlay from '@/components/player/AutoNextOverlay';
import SkipIntroPrompt from '@/components/player/SkipIntroPrompt';
import { SkipFeedbackOverlay, BufferingOverlay, PlayerErrorOverlay } from '@/components/player/PlayerOverlays';

interface WatchPageProps {
  params: Promise<{ slug: string; episode: string }>;
}

const ANIME_SKIP_SECONDS = 90;
const ANIME_INTRO_WINDOW_SECONDS = 100;

export default function WatchPage({ params }: WatchPageProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug, episode: episodeSlug } = use(params);

  const initialServerIdx = parseInt(searchParams.get('server') || '0', 10);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<ServerEpisode[]>([]);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);
  const [activeServerIdx, setActiveServerIdx] = useState(initialServerIdx);
  const [currentEpisode, setCurrentEpisode] = useState<ServerData | null>(null);
  const [nextEpisode, setNextEpisode] = useState<ServerData | null>(null);

  const [showAutoNext, setShowAutoNext] = useState(false);
  const [autoNextCounter, setAutoNextCounter] = useState(5);
  const [isSharpenEnabled, setIsSharpenEnabled] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const [introDismissedForEpisode, setIntroDismissedForEpisode] = useState<string | null>(null);
  const skipIntroDismissed = introDismissedForEpisode === episodeSlug;

  const [adultForceVerified, setAdultForceVerified] = useState(false);
  const isGated = !!movie && isAdultMovie(movie) && !adultForceVerified && !isAdultVerified();

  const handleAdultGateConfirm = () => {
    setAdultVerified();
    setAdultForceVerified(true);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const autoNextIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);

  const player = useVideoPlayer({ videoRef, containerRef: playerContainerRef });

  const isAnime = movie?.type === 'hoathinh';
  const showSkipIntroPrompt = isAnime && !skipIntroDismissed && player.isPlaying
    && player.currentTime > 2 && player.currentTime < ANIME_INTRO_WINDOW_SECONDS;

  const handleSkipOpEd = useCallback(() => {
    player.seekBy(ANIME_SKIP_SECONDS);
    setIntroDismissedForEpisode(episodeSlug);
  }, [player, episodeSlug]);

  useEffect(() => {
    const fetchWatchData = async () => {
      try {
        const res = await api.getMovieDetail(slug);
        if (res.status && res.movie) {
          setMovie(res.movie);
          const serverEpisodes = res.episodes || [];
          setEpisodes(serverEpisodes);

          if (res.movie.type === 'hoathinh' && res.movie.origin_name) {
            searchAnime(res.movie.origin_name).then(setAnimeInfo);
          }

          const activeServer = serverEpisodes[activeServerIdx] || serverEpisodes[0];
          if (activeServer && activeServer.server_data) {
            const index = activeServer.server_data.findIndex(e => e.slug === episodeSlug);
            const activeEp = activeServer.server_data[index] || activeServer.server_data[0];
            setCurrentEpisode(activeEp);

            const nextEp = activeServer.server_data[index + 1] || null;
            setNextEpisode(nextEp);
          }
        }
      } catch (err) {
        console.error('Failed to query movie streaming components:', err);
        setPlayerError('Streaming catalog lookup failed. Try switching servers or backup streams.');
      }
    };

    fetchWatchData();
  }, [slug, episodeSlug, activeServerIdx]);

  const handleServerChange = (index: number) => {
    setActiveServerIdx(index);
    setShowAutoNext(false);
    setPlayerError(null);
    router.push(`/watch/${slug}/${episodeSlug}?server=${index}`);
  };

  const restorePlayProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const lastWatched = useWatchHistoryStore.getState().getBySlug(slug);
    if (lastWatched && lastWatched.episodeSlug === episodeSlug && lastWatched.timestamp) {
      video.currentTime = lastWatched.timestamp;
    }

    video.play().catch(() => {});
  }, [slug, episodeSlug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentEpisode || isGated) return;

    const initTimer = setTimeout(() => {
      setPlayerError(null);
      setIsBuffering(true);
      setShowAutoNext(false);
    }, 0);

    const m3u8Url = currentEpisode.link_m3u8;

    if (!m3u8Url) {
      const offlineTimer = setTimeout(() => {
        setPlayerError('This episode streaming source is currently offline. Please try another node server.');
      }, 0);
      return () => {
        clearTimeout(initTimer);
        clearTimeout(offlineTimer);
      };
    }

    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsInstanceRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        restorePlayProgress();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error occurred:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Fatal network error. Retrying HLS connection...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal media error. Retrying recovery...');
              hls.recoverMediaError();
              break;
            default:
              setPlayerError('Stream connection disrupted. Please select another backup server above.');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = m3u8Url;
      video.addEventListener('loadedmetadata', restorePlayProgress);
    } else {
      setPlayerError('Your browser does not support HLS playback. We recommend Google Chrome or Safari.');
    }

    return () => {
      clearTimeout(initTimer);
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [currentEpisode, restorePlayProgress, isGated]);

  const handleTimeUpdate = () => {
    player.handleTimeUpdate();
    const video = videoRef.current;
    if (!video || !movie || !currentEpisode) return;

    const time = video.currentTime;
    const dur = video.duration || 0;
    if (dur > 0) {
      const percentage = (time / dur) * 100;
      if (Math.floor(time) % 4 === 0) {
        saveProgressToLocalStorage(time, percentage);
      }
    }
  };

  const saveProgressToLocalStorage = (time: number, percentage: number) => {
    if (!movie || !currentEpisode) return;

    useWatchHistoryStore.getState().upsert({
      _id: movie._id,
      name: movie.name,
      slug: movie.slug,
      origin_name: movie.origin_name,
      thumb_url: movie.thumb_url,
      poster_url: movie.poster_url,
      year: movie.year,
      quality: movie.quality,
      episodeSlug: episodeSlug,
      episodeName: currentEpisode.name,
      progress: Math.round(percentage),
      timestamp: time,
      updatedAt: new Date().toISOString(),
      category: movie.category,
    });
  };

  const handleVideoEnded = () => {
    if (nextEpisode) {
      setShowAutoNext(true);
      setAutoNextCounter(5);
    }
  };

  const handleNextEpisodeLaunch = useCallback(() => {
    if (nextEpisode) {
      setShowAutoNext(false);
      setPlayerError(null);
      router.push(`/watch/${slug}/${nextEpisode.slug}?server=${activeServerIdx}`);
    }
  }, [nextEpisode, slug, activeServerIdx, router]);

  useEffect(() => {
    if (!showAutoNext) {
      if (autoNextIntervalRef.current) clearInterval(autoNextIntervalRef.current);
      return;
    }

    autoNextIntervalRef.current = setInterval(() => {
      setAutoNextCounter((prev) => {
        if (prev <= 1) {
          if (autoNextIntervalRef.current) clearInterval(autoNextIntervalRef.current);
          handleNextEpisodeLaunch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (autoNextIntervalRef.current) clearInterval(autoNextIntervalRef.current);
    };
  }, [showAutoNext, nextEpisode, handleNextEpisodeLaunch]);

  if (isGated) {
    return (
      <div className="relative min-h-screen bg-[#060608] text-zinc-100 select-none pb-20 md:pb-0">
        <Header />
        <div className="pt-24 min-h-screen flex items-center justify-center px-4">
          <AdultConfirmModal
            onConfirm={handleAdultGateConfirm}
            onCancel={() => router.push(`/movie/${slug}`)}
          />
        </div>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#060608] text-zinc-100 select-none pb-20 md:pb-0">
      <Header />

      <main className="w-full pt-20 max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {}
          <div className="col-span-1 lg:col-span-8 space-y-4">

            <div className={isTheaterMode ? 'fixed inset-0 z-40 bg-black flex items-center justify-center p-0 sm:p-6' : ''}>
              <div
                ref={playerContainerRef}
                onMouseMove={player.handleMouseMove}
                onClick={player.handlePlayerAreaClick}
                className={`relative overflow-hidden bg-black border border-zinc-900 group shadow-2xl cursor-none ${
                  isTheaterMode ? 'w-full max-w-[1800px] aspect-video max-h-[92vh] rounded-none' : 'aspect-video w-full rounded-none'
                }`}
                style={{ cursor: player.showControls ? 'default' : 'none' }}
              >
                <video
                  ref={videoRef}
                  onTimeUpdate={handleTimeUpdate}
                  onDurationChange={player.handleDurationChange}
                  onSeeking={() => setIsBuffering(true)}
                  onSeeked={() => setIsBuffering(false)}
                  onPlaying={() => {
                    setIsBuffering(false);
                    player.onPlaying();
                  }}
                  onWaiting={() => setIsBuffering(true)}
                  onPause={player.onPause}
                  onEnded={handleVideoEnded}
                  controls={false}
                  className="w-full h-full object-contain transition-all duration-300"
                  style={{
                    filter: isSharpenEnabled
                      ? 'contrast(1.08) saturate(1.05) brightness(1.02) contrast(1.02)'
                      : 'none'
                  }}
                />

                {isSharpenEnabled && (
                  <div className="absolute inset-0 border border-[#E2B646]/20 pointer-events-none rounded-none glow-gold opacity-40 z-10 animate-pulse" />
                )}

                <SkipFeedbackOverlay direction={player.skipFeedback} />

                {isBuffering && !playerError && <BufferingOverlay />}

                {playerError && (
                  <PlayerErrorOverlay
                    message={playerError}
                    onRetry={() => {
                      setPlayerError(null);
                      setCurrentEpisode((prev) => (prev ? { ...prev } : prev));
                    }}
                  />
                )}

                {showAutoNext && nextEpisode && (
                  <AutoNextOverlay
                    nextEpisode={nextEpisode}
                    counter={autoNextCounter}
                    onCancel={() => setShowAutoNext(false)}
                    onPlayNow={handleNextEpisodeLaunch}
                  />
                )}

                <SkipIntroPrompt
                  visible={showSkipIntroPrompt && !showAutoNext && !playerError}
                  onSkip={handleSkipOpEd}
                  onDismiss={() => setIntroDismissedForEpisode(episodeSlug)}
                />

                <AnimatePresence>
                  {player.showControls && !playerError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 flex flex-col justify-between p-4 z-20"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-[9px] font-serif text-[#E2B646] font-bold uppercase tracking-[0.2em] italic">
                            NOW PLAYING &bull; EP {currentEpisode?.name || '1'}
                          </span>
                          <h1 className="font-serif font-bold text-sm text-zinc-200 truncate max-w-sm sm:max-w-md mt-0.5 leading-none italic">
                            {movie?.name}
                          </h1>
                        </div>
                      </div>

                      <PlayerControlBar
                        currentTime={player.currentTime}
                        duration={player.duration}
                        formatTime={player.formatTime}
                        onSeek={player.handleSeek}
                        onSeekStart={player.handleSeekStart}
                        onSeekEnd={player.handleSeekEnd}
                        isPlaying={player.isPlaying}
                        onPlayToggle={player.handlePlayToggle}
                        isMuted={player.isMuted}
                        volume={player.volume}
                        onVolumeChange={player.handleVolumeChange}
                        onMuteToggle={player.handleMuteToggle}
                        showAnimeSkip={isAnime}
                        onSkipOpEd={handleSkipOpEd}
                        isSharpenEnabled={isSharpenEnabled}
                        onToggleSharpen={() => setIsSharpenEnabled((v) => !v)}
                        playbackRate={player.playbackRate}
                        onSetRate={player.setRate}
                        isPipAvailable={player.isPipAvailable}
                        onTriggerPip={player.triggerPictureInPicture}
                        isFullscreen={player.isFullscreen}
                        onFullscreenToggle={player.handleFullscreenToggle}
                        isTheaterMode={isTheaterMode}
                        onTheaterToggle={() => setIsTheaterMode((v) => !v)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isTheaterMode && (
                <button
                  onClick={() => setIsTheaterMode(false)}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 bg-zinc-950/90 hover:bg-[#E2B646] border border-zinc-800 text-white hover:text-black transition-all cursor-pointer"
                  title="Exit Theater Mode"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {}
            <div className="p-6 bg-black/40 border border-zinc-850 rounded-none space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-serif font-black italic text-lg text-white">
                  {movie?.name}
                </h2>
                {currentEpisode && (
                  <span className="px-3 py-1 rounded-none bg-[#E2B646]/10 border border-[#E2B646]/20 text-[#E2B646] font-serif text-[10px] tracking-widest font-bold uppercase">
                    EPISODE {currentEpisode.name}
                  </span>
                )}
              </div>

              {/* Anime Info from AniList */}
              {animeInfo && (
                <div className="flex flex-wrap gap-3 pb-3 border-b border-zinc-900">
                  {animeInfo.episodes != null && (
                    <span className="px-2 py-1 bg-zinc-950/60 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                      {t('anime.episodes')}: <strong>{animeInfo.episodes > 0 ? animeInfo.episodes : '?'}</strong>
                    </span>
                  )}
                  {animeInfo.status && (
                    <span className="px-2 py-1 bg-zinc-950/60 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                      {t('anime.status')}: <strong>{translateAnimeStatus(animeInfo.status, language)}</strong>
                    </span>
                  )}
                  {animeInfo.averageScore != null && (
                    <span className="px-2 py-1 bg-zinc-950/60 border border-zinc-800 text-[10px] font-mono text-[#E2B646]">
                      {t('anime.score')}: <strong>{animeInfo.averageScore}%</strong>
                    </span>
                  )}
                  {animeInfo.studios.length > 0 && (
                    <span className="px-2 py-1 bg-zinc-950/60 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                      {t('anime.studio')}: <strong>{animeInfo.studios[0]}</strong>
                    </span>
                  )}
                  {animeInfo.nextAiringEpisode && (
                    <span className="px-2 py-1 bg-zinc-950/60 border border-[#E2B646]/20 text-[10px] font-mono text-[#E2B646]">
                      {t('anime.next_episode')} #{animeInfo.nextAiringEpisode.episode} &mdash; {formatNextAiringTime(animeInfo.nextAiringEpisode.airingAt, language)}
                    </span>
                  )}
                </div>
              )}

              {movie?.content && (
                <MovieSynopsis
                  html={movie.content}
                  className="font-sans text-xs sm:text-sm text-zinc-300 leading-relaxed pb-3 border-b border-zinc-900"
                />
              )}

              <p className="font-sans text-xs text-zinc-550 select-text leading-relaxed">
                {movie?.origin_name} &bull; Quality: {movie?.quality} &bull; Audio: {movie?.lang} &bull; Year: {movie?.year}. If playback lags or buffering is slow, try toggling to another Server Node from the right panel. All watch logs are saved automatically to your browser history.
              </p>
            </div>
          </div>

          <StreamSidebar
            episodes={episodes}
            activeServerIdx={activeServerIdx}
            onServerChange={handleServerChange}
            slug={slug}
            episodeSlug={episodeSlug}
          />
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, use, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Heart, Bell, BellOff, Star, Info, MoveLeft, Lock, Unlock } from 'lucide-react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'motion/react';
import { api, MovieDetail, ServerEpisode, ServerData } from '@/lib/api';
import { isAdultMovie, isAdultVerified, setAdultVerified } from '@/lib/adult';
import { searchAnime, AnimeInfo, translateAnimeStatus, translateAnimeFormat, formatNextAiringTime } from '@/lib/anime';
import { useLanguage } from '@/hooks/useLanguage';
import { useWatchHistoryStore } from '@/lib/stores/useWatchHistoryStore';
import { useFavoritesStore } from '@/lib/stores/useFavoritesStore';
import { useReminderStore } from '@/lib/stores/useReminderStore';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { useAudioEnhancer } from '@/hooks/useAudioEnhancer';
import { useFsrUpscale } from '@/hooks/useFsrUpscale';
import { useFrameInterpolation } from '@/hooks/useFrameInterpolation';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useWatchPartyRoomStore } from '@/lib/stores/useWatchPartyRoomStore';
import { isValidRoomCodeFormat, normalizeRoomCode } from '@/lib/watchParty/roomCode';
import { PLAYBACK_HEARTBEAT_MS, PLAYBACK_DRIFT_THRESHOLD_SECONDS } from '@/lib/watchParty/constants';
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
import WatchPartyToggle from '@/components/watchparty/WatchPartyToggle';
import EpisodeChangePrompt from '@/components/watchparty/EpisodeChangePrompt';
import FloatingComments from '@/components/watchparty/FloatingComments';
import FloatingReactions from '@/components/watchparty/FloatingReactions';
import FloatingCommentsToggle from '@/components/watchparty/FloatingCommentsToggle';
import QuickChatInput from '@/components/watchparty/QuickChatInput';

interface WatchPageProps {
  params: Promise<{ slug: string; episode: string }>;
}

const ANIME_SKIP_SECONDS = 90;
const ANIME_INTRO_WINDOW_SECONDS = 100;

const noop = () => { };
const noopSeek = (_e: React.ChangeEvent<HTMLInputElement>) => { };

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
  // Bumped by the error overlay's retry button to force the HLS-init effect
  // to re-run even when currentEpisode itself hasn't changed.
  const [retryNonce, setRetryNonce] = useState(0);

  const [showAutoNext, setShowAutoNext] = useState(false);
  const [autoNextCounter, setAutoNextCounter] = useState(5);
  const [isSharpenEnabled, setIsSharpenEnabled] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [autoJoinCode, setAutoJoinCode] = useState<string | undefined>(undefined);

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
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
  const autoNextIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);

  const player = useVideoPlayer({ videoRef, containerRef: playerContainerRef });

  const party = useWatchParty();
  const partyRoomCode = useWatchPartyRoomStore((s) => s.roomCode);
  const partyIsHost = useWatchPartyRoomStore((s) => s.isHost());
  const partyCanControl = useWatchPartyRoomStore((s) => s.canControlPlayback());
  const partyMovieSlug = useWatchPartyRoomStore((s) => s.movieSlug);
  const partyEpisodeSlug = useWatchPartyRoomStore((s) => s.episodeSlug);
  const partyPlayback = useWatchPartyRoomStore((s) => s.playback);
  const partyPendingEpisodeChange = useWatchPartyRoomStore((s) => s.pendingEpisodeChange);
  const canControlVideo = !partyRoomCode || partyCanControl;

  // Prefill the join code when arriving via a share link.
  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (!roomParam) return;
    const code = normalizeRoomCode(roomParam);
    if (isValidRoomCodeFormat(code)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoJoinCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Host propagates episode changes to the room; members just react to
  // `partyMovieSlug`/`partyEpisodeSlug` changes via the effect below.
  useEffect(() => {
    if (!partyRoomCode || !partyIsHost) return;
    if (partyMovieSlug !== slug || partyEpisodeSlug !== episodeSlug) {
      party.changeEpisode(slug, episodeSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, episodeSlug, partyRoomCode, partyIsHost]);

  useEffect(() => {
    if (!partyRoomCode || partyIsHost || !partyMovieSlug || !partyEpisodeSlug || partyPendingEpisodeChange) return;
    if (partyMovieSlug !== slug || partyEpisodeSlug !== episodeSlug) {
      router.push(`/watch/${partyMovieSlug}/${partyEpisodeSlug}`);
    }
  }, [partyRoomCode, partyIsHost, partyMovieSlug, partyEpisodeSlug, partyPendingEpisodeChange, slug, episodeSlug, router]);

  useEffect(() => {
    if (!partyRoomCode || !partyPlayback) return;
    const video = videoRef.current;
    if (!video) return;
    const elapsed = partyPlayback.isPlaying ? (Date.now() - partyPlayback.updatedAt) / 1000 : 0;
    const expected = partyPlayback.currentTime + elapsed;
    if (Math.abs(video.currentTime - expected) > PLAYBACK_DRIFT_THRESHOLD_SECONDS) {
      video.currentTime = expected;
    }
    if (partyPlayback.isPlaying && video.paused) {
      video.play().catch(() => { });
    } else if (!partyPlayback.isPlaying && !video.paused) {
      video.pause();
    }
  }, [partyRoomCode, partyPlayback]);

  useEffect(() => {
    if (!partyRoomCode || !canControlVideo || !player.isPlaying) return;
    const id = setInterval(() => {
      const video = videoRef.current;
      if (video) party.updatePlayback(true, video.currentTime);
    }, PLAYBACK_HEARTBEAT_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyRoomCode, canControlVideo, player.isPlaying]);

  const betaAudioPreset = usePreferencesStore((s) => s.betaAudioPreset);
  const betaFsrUpscale = usePreferencesStore((s) => s.betaFsrUpscale);
  const betaFsrUpscaleMode = usePreferencesStore((s) => s.betaFsrUpscaleMode);
  const betaFrameInterpolation = usePreferencesStore((s) => s.betaFrameInterpolation);
  const betaFrameInterpolationMode = usePreferencesStore((s) => s.betaFrameInterpolationMode);
  const setBetaFsrUpscale = usePreferencesStore((s) => s.setBetaFsrUpscale);
  const setBetaFrameInterpolation = usePreferencesStore((s) => s.setBetaFrameInterpolation);

  const audioEnhancer = useAudioEnhancer({ videoRef, preset: betaAudioPreset });
  const fsrUpscale = useFsrUpscale({
    videoRef,
    canvasRef: effectsCanvasRef,
    enabled: betaFsrUpscale,
    mode: betaFsrUpscaleMode,
    onFatalError: useCallback(() => setBetaFsrUpscale(false), [setBetaFsrUpscale]),
  });
  const frameInterpolation = useFrameInterpolation({
    videoRef,
    canvasRef: effectsCanvasRef,
    enabled: betaFrameInterpolation,
    mode: betaFrameInterpolationMode,
    onFatalError: useCallback(() => setBetaFrameInterpolation(false), [setBetaFrameInterpolation]),
  });
  const webgpuSupported = fsrUpscale.isSupported;
  const showEffectsCanvas = betaFsrUpscale || betaFrameInterpolation;

  const isAnime = movie?.type === 'hoathinh';
  const showSkipIntroPrompt = isAnime && !skipIntroDismissed && player.isPlaying
    && player.currentTime > 2 && player.currentTime < ANIME_INTRO_WINDOW_SECONDS;

  const handleSkipOpEd = useCallback(() => {
    player.seekBy(ANIME_SKIP_SECONDS);
    setIntroDismissedForEpisode(episodeSlug);
  }, [player, episodeSlug]);

  const isFavorited = useFavoritesStore((s) => (movie ? s.isFavorited(movie.slug) : false));
  const toggleFavoriteInStore = useFavoritesStore((s) => s.toggleFavorite);
  const isReminded = useReminderStore((s) => (movie ? s.isReminded(movie.slug) : false));
  const toggleReminderInStore = useReminderStore((s) => s.toggleReminder);

  const toggleFavorite = () => {
    if (!movie) return;
    toggleFavoriteInStore(movie);
  };

  const toggleReminder = () => {
    if (!movie) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    toggleReminderInStore(movie);
  };

  // Only the movie changes require a network round-trip -- episode/server
  // switches just pick a different entry out of data we already have.
  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        const res = await api.getMovieDetail(slug);
        if (res.status && res.movie) {
          setMovie(res.movie);
          setEpisodes(res.episodes || []);

          if (res.movie.type === 'hoathinh' && res.movie.origin_name) {
            searchAnime(res.movie.origin_name).then(setAnimeInfo);
          }
        }
      } catch (err) {
        console.error('Failed to query movie streaming components:', err);
        setPlayerError('Streaming catalog lookup failed. Try switching servers or backup streams.');
      }
    };

    fetchMovieData();
  }, [slug]);

  const activeServerData = (episodes[activeServerIdx] || episodes[0])?.server_data;
  const episodeIndex = activeServerData?.findIndex(e => e.slug === episodeSlug) ?? -1;
  const currentEpisode = useMemo<ServerData | null>(
    () => (activeServerData ? activeServerData[episodeIndex] || activeServerData[0] || null : null),
    [activeServerData, episodeIndex]
  );
  const nextEpisode = useMemo<ServerData | null>(
    () => (activeServerData ? activeServerData[episodeIndex + 1] || null : null),
    [activeServerData, episodeIndex]
  );

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

    video.play().catch(() => { });
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
        if (data.fatal) {
          console.error('Fatal HLS error:', data);
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
        } else if (data.details !== Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          console.warn('Non-fatal HLS event:', data.details);
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
  }, [currentEpisode, restorePlayProgress, isGated, retryNonce]);

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

          <div className="col-span-1 lg:col-span-8 space-y-4">

            <div className="flex justify-between">
              <Link
                href={`/movie/${slug}`}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 border border-zinc-800 hover:border-[#E2B646] text-zinc-400 hover:text-[#E2B646] text-[9px] font-mono font-bold uppercase tracking-wider transition-all"
                title={t('watch.back_to_movie')}
              >
                <MoveLeft size={11}/>
                <span className="hidden sm:inline">{t('watch.back_to_movie')}</span>
              </Link>
            </div>
            <div className={isTheaterMode ? 'fixed inset-0 z-40 bg-black flex items-center justify-center p-0 sm:p-6' : ''}>
              <div
                ref={playerContainerRef}
                onMouseMove={player.handleMouseMove}
                onClick={canControlVideo ? player.handlePlayerAreaClick : undefined}
                className={`relative overflow-hidden bg-black border border-zinc-900 group shadow-2xl cursor-none ${isTheaterMode ? 'w-full max-w-[1800px] aspect-video max-h-[92vh] rounded-none' : 'aspect-video w-full rounded-none'
                  }`}
                style={{ cursor: (player.showControls || player.isLocked) ? 'default' : 'none' }}
              >
                <video
                  ref={videoRef}
                  crossOrigin="anonymous"
                  onTimeUpdate={handleTimeUpdate}
                  onDurationChange={player.handleDurationChange}
                  onProgress={player.handleProgress}
                  onSeeked={() => {
                    setIsBuffering(false);
                    if (partyRoomCode && canControlVideo && videoRef.current) {
                      party.updatePlayback(!videoRef.current.paused, videoRef.current.currentTime);
                    }
                  }}
                  onPlaying={() => {
                    setIsBuffering(false);
                    player.onPlaying();
                    if (partyRoomCode && canControlVideo && videoRef.current) {
                      party.updatePlayback(true, videoRef.current.currentTime);
                    }
                  }}
                  onWaiting={() => setIsBuffering(true)}
                  onPause={() => {
                    player.onPause();
                    if (partyRoomCode && canControlVideo && videoRef.current) {
                      party.updatePlayback(false, videoRef.current.currentTime);
                    }
                  }}
                  onEnded={handleVideoEnded}
                  controls={false}
                  className={`w-full h-full object-contain transition-all duration-300 ${showEffectsCanvas ? 'opacity-0' : ''}`}
                  style={{
                    filter: isSharpenEnabled
                      ? 'contrast(1.08) saturate(1.05) brightness(1.02) contrast(1.02)'
                      : 'none'
                  }}
                />

                {
                }
                {showEffectsCanvas && (
                  <canvas
                    ref={effectsCanvasRef}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                )}

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
                      setRetryNonce((n) => n + 1);
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

                {partyRoomCode && (
                  <>
                    <FloatingComments />
                    <FloatingReactions />
                  </>
                )}

                <EpisodeChangePrompt />

                {!playerError && (
                  <button
                    onClick={(e) => { if (e.detail === 2) player.toggleLock(); }}
                    className={`absolute top-3 left-3 z-30 p-2 rounded-full border transition-all cursor-pointer ${player.isLocked
                      ? 'bg-[#E2B646]/90 border-[#E2B646] text-black opacity-70 hover:opacity-100'
                      : 'bg-black/40 border-zinc-700 text-zinc-300 opacity-60 hover:opacity-100'
                      }`}
                    title={player.isLocked ? t('watch.unlock_screen') : t('watch.lock_screen')}
                  >
                    {player.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                )}

                <AnimatePresence>
                  {player.showControls && !playerError && !player.isLocked && (
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

                      {partyRoomCode && !canControlVideo && (
                        <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider text-center">
                          {t('watchparty.host_controls_only')}
                        </p>
                      )}

                      <PlayerControlBar
                        currentTime={player.currentTime}
                        duration={player.duration}
                        bufferedEnd={player.bufferedEnd}
                        formatTime={player.formatTime}
                        onSeek={canControlVideo ? player.handleSeek : noopSeek}
                        onSeekStart={canControlVideo ? player.handleSeekStart : noop}
                        onSeekEnd={canControlVideo ? player.handleSeekEnd : noop}
                        isPlaying={player.isPlaying}
                        onPlayToggle={canControlVideo ? player.handlePlayToggle : noop}
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
                        webgpuSupported={webgpuSupported}
                        fsrError={fsrUpscale.error}
                        frameInterpolationError={frameInterpolation.error}
                        audioError={audioEnhancer.error}
                      />

                      {partyRoomCode && (
                        <>
                          <FloatingCommentsToggle />
                          <QuickChatInput />
                        </>
                      )}
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

            { }
            <div className="p-6 bg-black/40 border border-zinc-850 rounded-none space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 className="font-serif font-black italic text-lg text-white ">
                    {movie?.name}
                  </h2>

                </div>
                {currentEpisode && (
                  <span className="px-3 py-1 rounded-none bg-[#E2B646]/10 border border-[#E2B646]/20 text-[#E2B646] font-serif text-[10px] tracking-widest font-bold uppercase shrink-0">
                    EPISODE {currentEpisode.name}
                  </span>
                )}
              </div>

              {
              }
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-zinc-900">
                {!!movie?.tmdb?.vote_average && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-zinc-950/60 border border-zinc-800 text-[10px] font-mono text-[#E2B646]">
                    <Star size={11} className="fill-current" />
                    TMDB {movie.tmdb.vote_average.toFixed(1)}
                  </span>
                )}
                {!!movie?.imdb?.vote_average && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-zinc-950/60 border border-zinc-800 text-[10px] font-mono text-[#E2B646]">
                    <Star size={11} className="fill-current" />
                    IMDb {movie.imdb.vote_average.toFixed(1)}
                  </span>
                )}

                <button
                  onClick={toggleFavorite}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${isFavorited
                    ? 'border-[#E2B646]/30 bg-[#E2B646]/10 text-[#E2B646]'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white'
                    }`}
                >
                  <Heart size={12} className={isFavorited ? 'fill-[#E2B646]' : ''} />
                  <span>{isFavorited ? t('movie.pinned') : t('movie.pin')}</span>
                </button>

                <button
                  onClick={toggleReminder}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${isReminded
                    ? 'border-[#E2B646]/30 bg-[#E2B646]/10 text-[#E2B646]'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white'
                    }`}
                >
                  {isReminded ? <BellOff size={12} /> : <Bell size={12} />}
                  <span>{isReminded ? (language === 'vi' ? 'Bỏ Nhắc' : 'Unremind') : (language === 'vi' ? 'Nhắc Xem' : 'Remind Me')}</span>
                </button>
              </div>

              { }
              {movie?.category && movie.category.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-3 border-b border-zinc-900">
                  {movie.category.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      className="px-2.5 py-1 text-[10px] bg-zinc-900 border border-zinc-850 text-zinc-300 hover:border-[#E2B646] hover:text-[#E2B646] uppercase tracking-widest transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}

              { }
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

          <div className="col-span-1 lg:col-span-4 space-y-6">
            <WatchPartyToggle
              movieSlug={slug}
              episodeSlug={episodeSlug}
              initialJoinCode={autoJoinCode}
              currentTime={player.currentTime}
              isPlaying={player.isPlaying}
            />

            <StreamSidebar
              episodes={episodes}
              activeServerIdx={activeServerIdx}
              onServerChange={handleServerChange}
              slug={slug}
              episodeSlug={episodeSlug}
            />
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

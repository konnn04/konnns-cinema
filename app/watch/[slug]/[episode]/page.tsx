'use client';

import { useState, useEffect, useRef, use, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Hls from 'hls.js';
import { api, MovieDetail, MovieItem, ServerEpisode, ServerData, resolveImageUrl } from '@/lib/api';
import { isAdultMovie, isAdultVerified, setAdultVerified } from '@/lib/adult';
import { searchAnime, AnimeInfo } from '@/lib/anime';
import { useLanguage } from '@/hooks/useLanguage';
import { useWatchHistoryStore } from '@/lib/stores/useWatchHistoryStore';
import { useFavoritesStore } from '@/lib/stores/useFavoritesStore';
import { useReminderStore } from '@/lib/stores/useReminderStore';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useIsTV, useTVBackKey } from '@/hooks/use-tv';
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
import WatchPagePC from '@/components/watch/WatchPagePC';
import WatchPageTV from '@/components/watch/WatchPageTV';

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
  const isTV = useIsTV();

  const initialServerIdx = parseInt(searchParams.get('server') || '0', 10);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<ServerEpisode[]>([]);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);
  const [recommended, setRecommended] = useState<MovieItem[]>([]);
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

  useTVBackKey(() => {
    if (player.showControls) {
      player.toggleControlsVisibility();
    } else {
      router.push(`/movie/${slug}`);
    }
  }, isTV);

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

  // The TV layout has a "more like this" shelf the PC/mobile layout doesn't
  // show, so only fetch it there.
  useEffect(() => {
    if (!isTV || !movie?.category?.length) return;
    api.getMoviesByGenre(movie.category[0].slug, 1)
      .then((res) => setRecommended(res.items.filter((item) => item.slug !== movie.slug).slice(0, 12)))
      .catch(() => { });
  }, [isTV, movie]);

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
  const previousEpisode = useMemo<ServerData | null>(
    () => (activeServerData && episodeIndex > 0 ? activeServerData[episodeIndex - 1] || null : null),
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

  const handlePreviousEpisodeLaunch = useCallback(() => {
    if (previousEpisode) {
      setShowAutoNext(false);
      setPlayerError(null);
      router.push(`/watch/${slug}/${previousEpisode.slug}?server=${activeServerIdx}`);
    }
  }, [previousEpisode, slug, activeServerIdx, router]);

  const seekBackward = useCallback(() => player.seekBy(-10), [player]);
  const seekForward = useCallback(() => player.seekBy(10), [player]);

  useMediaSession({
    title: movie?.name || "Konnn's Cinema",
    artist: currentEpisode ? `${t('watch.episode_catalog')} ${currentEpisode.name} • Konnn's Cinema` : "Konnn's Cinema",
    artworkUrl: movie ? resolveImageUrl(movie.thumb_url || movie.poster_url) : undefined,
    isPlaying: player.isPlaying,
    currentTime: player.currentTime,
    duration: player.duration,
    playbackRate: player.playbackRate,
    onPlay: player.handlePlayToggle,
    onPause: player.handlePlayToggle,
    onSeekBackward: seekBackward,
    onSeekForward: seekForward,
    onPreviousTrack: previousEpisode ? handlePreviousEpisodeLaunch : undefined,
    onNextTrack: nextEpisode ? handleNextEpisodeLaunch : undefined,
  });

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
        {!isTV && <Header />}
        <div className="pt-24 min-h-screen flex items-center justify-center px-4">
          <AdultConfirmModal
            onConfirm={handleAdultGateConfirm}
            onCancel={() => router.push(`/movie/${slug}`)}
          />
        </div>
        {!isTV && <Footer />}
        {!isTV && <MobileNav />}
      </div>
    );
  }

  if (isTV) {
    return (
      <WatchPageTV
        t={t}
        language={language}
        slug={slug}
        episodeSlug={episodeSlug}
        movie={movie}
        episodes={episodes}
        activeServerIdx={activeServerIdx}
        handleServerChange={handleServerChange}
        currentEpisode={currentEpisode}
        nextEpisode={nextEpisode}
        isAnime={isAnime}
        player={player}
        videoRef={videoRef}
        playerContainerRef={playerContainerRef}
        canControlVideo={canControlVideo}
        handleTimeUpdate={handleTimeUpdate}
        isBuffering={isBuffering}
        setIsBuffering={setIsBuffering}
        playerError={playerError}
        setPlayerError={setPlayerError}
        setRetryNonce={setRetryNonce}
        showAutoNext={showAutoNext}
        setShowAutoNext={setShowAutoNext}
        autoNextCounter={autoNextCounter}
        handleNextEpisodeLaunch={handleNextEpisodeLaunch}
        handleVideoEnded={handleVideoEnded}
        showSkipIntroPrompt={showSkipIntroPrompt}
        handleSkipOpEd={handleSkipOpEd}
        setIntroDismissedForEpisode={setIntroDismissedForEpisode}
        partyRoomCode={partyRoomCode}
        party={party}
        autoJoinCode={autoJoinCode}
        isFavorited={isFavorited}
        toggleFavorite={toggleFavorite}
        isReminded={isReminded}
        toggleReminder={toggleReminder}
        recommended={recommended}
      />
    );
  }

  return (
    <WatchPagePC
      t={t}
      language={language}
      slug={slug}
      episodeSlug={episodeSlug}
      movie={movie}
      episodes={episodes}
      activeServerIdx={activeServerIdx}
      handleServerChange={handleServerChange}
      currentEpisode={currentEpisode}
      nextEpisode={nextEpisode}
      animeInfo={animeInfo}
      isAnime={isAnime}
      player={player}
      videoRef={videoRef}
      playerContainerRef={playerContainerRef}
      effectsCanvasRef={effectsCanvasRef}
      canControlVideo={canControlVideo}
      handleTimeUpdate={handleTimeUpdate}
      isTheaterMode={isTheaterMode}
      setIsTheaterMode={setIsTheaterMode}
      isBuffering={isBuffering}
      setIsBuffering={setIsBuffering}
      playerError={playerError}
      setPlayerError={setPlayerError}
      setRetryNonce={setRetryNonce}
      isSharpenEnabled={isSharpenEnabled}
      setIsSharpenEnabled={setIsSharpenEnabled}
      showEffectsCanvas={showEffectsCanvas}
      webgpuSupported={webgpuSupported}
      fsrError={fsrUpscale.error}
      frameInterpolationError={frameInterpolation.error}
      audioError={audioEnhancer.error}
      showAutoNext={showAutoNext}
      setShowAutoNext={setShowAutoNext}
      autoNextCounter={autoNextCounter}
      handleNextEpisodeLaunch={handleNextEpisodeLaunch}
      handleVideoEnded={handleVideoEnded}
      showSkipIntroPrompt={showSkipIntroPrompt}
      handleSkipOpEd={handleSkipOpEd}
      setIntroDismissedForEpisode={setIntroDismissedForEpisode}
      partyRoomCode={partyRoomCode}
      party={party}
      autoJoinCode={autoJoinCode}
      isFavorited={isFavorited}
      toggleFavorite={toggleFavorite}
      isReminded={isReminded}
      toggleReminder={toggleReminder}
    />
  );
}

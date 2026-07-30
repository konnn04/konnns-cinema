'use client';

import { RefObject, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Bell, BellOff, Star, MoveLeft, Home, RotateCcw, RotateCw, Maximize, Minimize, Download } from 'lucide-react';
import { setFocus, getCurrentFocusKey, ROOT_FOCUS_KEY } from '@noriginmedia/norigin-spatial-navigation';
import { MovieDetail, MovieItem, ServerEpisode, ServerData } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { Language } from '@/hooks/useLanguage';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useTVFocusable } from '@/hooks/useTVFocusable';
import FocusableButton from '@/components/tv/FocusableButton';
import TVMovieShelf from '@/components/tv/TVMovieShelf';
import StreamSidebar from '@/components/player/StreamSidebar';
import PlayerControlBar from '@/components/player/PlayerControlBar';
import AutoNextOverlay from '@/components/player/AutoNextOverlay';
import SkipIntroPrompt, { SKIP_INTRO_FOCUS_KEY } from '@/components/player/SkipIntroPrompt';
import { SkipFeedbackOverlay, BufferingOverlay, PlayerErrorOverlay } from '@/components/player/PlayerOverlays';
import WatchPartyToggle from '@/components/watchparty/WatchPartyToggle';
import EpisodeChangePrompt from '@/components/watchparty/EpisodeChangePrompt';
import FloatingComments from '@/components/watchparty/FloatingComments';
import FloatingReactions from '@/components/watchparty/FloatingReactions';

export interface WatchPageTVProps {
  t: (key: string, replacements?: Record<string, string | number>) => string;
  language: Language;
  slug: string;
  episodeSlug: string;

  movie: MovieDetail | null;
  episodes: ServerEpisode[];
  activeServerIdx: number;
  handleServerChange: (index: number) => void;
  currentEpisode: ServerData | null;
  nextEpisode: ServerData | null;
  isAnime: boolean;

  player: ReturnType<typeof useVideoPlayer>;
  videoRef: RefObject<HTMLVideoElement | null>;
  playerContainerRef: RefObject<HTMLDivElement | null>;
  canControlVideo: boolean;
  handleTimeUpdate: () => void;

  isBuffering: boolean;
  setIsBuffering: (value: boolean) => void;
  playerError: string | null;
  setPlayerError: (value: string | null) => void;
  setRetryNonce: (value: number | ((prev: number) => number)) => void;

  showAutoNext: boolean;
  setShowAutoNext: (value: boolean) => void;
  autoNextCounter: number;
  handleNextEpisodeLaunch: () => void;
  handleVideoEnded: () => void;

  showSkipIntroPrompt: boolean;
  handleSkipOpEd: () => void;
  setIntroDismissedForEpisode: (value: string | null) => void;

  partyRoomCode: string | null;
  party: ReturnType<typeof useWatchParty>;
  autoJoinCode: string | undefined;

  isFavorited: boolean;
  toggleFavorite: () => void;
  isReminded: boolean;
  toggleReminder: () => void;

  recommended: MovieItem[];
}

const noop = () => { };
const noopSeek = (_e: React.ChangeEvent<HTMLInputElement>) => { };

export default function WatchPageTV(props: WatchPageTVProps) {
  const {
    t, language, slug, episodeSlug,
    movie, episodes, activeServerIdx, handleServerChange, currentEpisode, nextEpisode, isAnime,
    player, videoRef, playerContainerRef, canControlVideo, handleTimeUpdate,
    isBuffering, setIsBuffering, playerError, setPlayerError, setRetryNonce,
    showAutoNext, setShowAutoNext, autoNextCounter, handleNextEpisodeLaunch, handleVideoEnded,
    showSkipIntroPrompt, handleSkipOpEd, setIntroDismissedForEpisode,
    partyRoomCode, party, autoJoinCode,
    isFavorited, toggleFavorite, isReminded, toggleReminder,
    recommended,
  } = props;

  const handleDownload = useCallback(() => {
    const downloadUrl = currentEpisode?.link_m3u8;
    if (!downloadUrl) {
      toast.warning(t('watch.download_unavailable'));
      return;
    }
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    toast.info(t('watch.download_started'));
  }, [currentEpisode, t]);

  const revealControls = useCallback(() => {
    if (player.showControls) return;
    player.toggleControlsVisibility();
    setTimeout(() => setFocus('tv-watch-play'), 0);
  }, [player]);

  const { ref: backToMovieRef, tvFocusClassName: backToMovieFocusClassName } = useTVFocusable<HTMLAnchorElement | null>();
  const { ref: homeLinkRef, tvFocusClassName: homeLinkFocusClassName } = useTVFocusable<HTMLAnchorElement | null>();
  const { ref: fullscreenBtnRef, focused: fullscreenBtnFocused, tvFocusClassName: fullscreenBtnFocusClassName } = useTVFocusable<HTMLButtonElement | null>();

  const { ref: videoRegionRef, focusSelf: focusVideoRegion } = useTVFocusable<HTMLDivElement | null>({
    focusKey: 'tv-video-region',
    onEnterPress: revealControls,
    onArrowPress: (direction) => {
      if (direction === 'left' || direction === 'right') {
        player.seekBy(direction === 'right' ? 10 : -10);
        return false;
      }
      revealControls();
      return false;
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (player.showControls) player.toggleControlsVisibility();
      // TV has no useful software volume control (see hideVolumeControl
      // below) -- start at max so the OS/TV's own hardware volume is what
      // actually governs loudness.
      player.setVolumeLevel(1);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-hide (the 3s timer inside toggleControlsVisibility) can fire while
  // the user has since navigated away to the episode grid/tools below --
  // only reclaim focus if it's still sitting somewhere in the player itself.
  // Nothing has a focusKey at all before the very first focus of the
  // session (SpatialNavigationService starts with a null focusKey, not
  // ROOT_FOCUS_KEY), which is exactly the state right after this effect's
  // own initial hide -- that case also needs to bootstrap the first focus.
  useEffect(() => {
    if (player.showControls) return;
    const timer = setTimeout(() => {
      const currentKey = getCurrentFocusKey();
      if (!currentKey || currentKey === 'tv-video-region' || currentKey === 'tv-watch-play' || currentKey === ROOT_FOCUS_KEY) {
        focusVideoRegion();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [player.showControls, focusVideoRegion]);

  // The skip-intro prompt only appears for a short window -- put focus on
  // it immediately so OK activates it without the user having to navigate.
  useEffect(() => {
    if (!showSkipIntroPrompt) return;
    const timer = setTimeout(() => setFocus(SKIP_INTRO_FOCUS_KEY), 0);
    return () => clearTimeout(timer);
  }, [showSkipIntroPrompt]);

  return (
    <div className="min-h-screen bg-[#060608] text-zinc-100">
      <div
        ref={(node) => {
          playerContainerRef.current = node;
          videoRegionRef.current = node;
        }}
        onMouseMove={player.handleMouseMove}
        onClick={canControlVideo ? player.handlePlayerAreaClick : undefined}
        className="relative w-full h-[100dvh] bg-black overflow-hidden group"
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
          className="w-full h-full object-contain"
        />

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

        {/* Reachable without revealing the whole controls overlay (the TV's
            own browser chrome -- address bar etc. -- has no other way to be
            dismissed), but kept out of the way of actually watching:
            invisible until hovered or D-pad-focused. */}
        <button
          ref={(node) => { fullscreenBtnRef.current = node; }}
          onClick={player.handleFullscreenToggle}
          className={cn(
            'absolute top-6 right-6 z-30 p-2.5 bg-black/70 border border-zinc-700 text-zinc-300 hover:text-white transition-opacity cursor-pointer opacity-0 group-hover:opacity-100',
            fullscreenBtnFocused && 'opacity-100',
            fullscreenBtnFocusClassName
          )}
          title={player.isFullscreen ? t('watch.exit_fullscreen') : t('watch.enter_fullscreen')}
        >
          {player.isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

        {player.showControls && !playerError && (
          <>
            <div className="absolute top-6 left-6 z-30 flex items-center gap-2">
              <Link
                ref={backToMovieRef}
                href={`/movie/${slug}`}
                className={cn('flex items-center gap-1.5 px-3 py-2 bg-black/70 border border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-mono font-bold uppercase tracking-wider transition-all', backToMovieFocusClassName)}
              >
                <MoveLeft size={13} />
                {t('watch.back_to_movie')}
              </Link>
              <Link
                ref={homeLinkRef}
                href="/"
                className={cn('flex items-center gap-1.5 px-3 py-2 bg-black/70 border border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-mono font-bold uppercase tracking-wider transition-all', homeLinkFocusClassName)}
              >
                <Home size={13} />
                {t('watch.browse_other_movies')}
              </Link>
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 pt-16 space-y-3">
              <div className="flex items-center justify-center gap-4">
                <FocusableButton
                  onClick={() => player.seekBy(-10)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-mono font-bold uppercase tracking-wider cursor-pointer"
                >
                  <RotateCcw size={14} />
                  10s
                </FocusableButton>
                <FocusableButton
                  onClick={() => player.seekBy(10)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-mono font-bold uppercase tracking-wider cursor-pointer"
                >
                  <RotateCw size={14} />
                  10s
                </FocusableButton>
              </div>

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
                playButtonFocusKey="tv-watch-play"
                isMuted={player.isMuted}
                volume={player.volume}
                onVolumeChange={player.handleVolumeChange}
                onMuteToggle={player.handleMuteToggle}
                hideVolumeControl
                showAnimeSkip={isAnime}
                onSkipOpEd={handleSkipOpEd}
                isSharpenEnabled={false}
                onToggleSharpen={noop}
                playbackRate={player.playbackRate}
                onSetRate={player.setRate}
                isPipAvailable={player.isPipAvailable}
                onTriggerPip={player.triggerPictureInPicture}
                isFullscreen={player.isFullscreen}
                onFullscreenToggle={player.handleFullscreenToggle}
                isTheaterMode={false}
                onTheaterToggle={noop}
                hideTheaterToggle
                webgpuSupported={false}
                fsrError={null}
                frameInterpolationError={null}
                audioError={null}
              />
            </div>
          </>
        )}
      </div>

      <main className="max-w-[1600px] mx-auto px-8 py-6 space-y-8">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 space-y-4">
            <div>
              <h1 className="font-serif font-black italic text-2xl text-white">{movie?.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {currentEpisode && (
                  <span className="px-3 py-1 bg-[#E2B646]/10 border border-[#E2B646]/20 text-[#E2B646] font-serif text-[10px] tracking-widest font-bold uppercase">
                    EPISODE {currentEpisode.name}
                  </span>
                )}
                {!!movie?.tmdb?.vote_average && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-zinc-950/60 border border-zinc-800 text-[10px] font-mono text-[#E2B646]">
                    <Star size={11} className="fill-current" />
                    TMDB {movie.tmdb.vote_average.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            <StreamSidebar
              episodes={episodes}
              activeServerIdx={activeServerIdx}
              onServerChange={handleServerChange}
              slug={slug}
              episodeSlug={episodeSlug}
              episodeGridClassName="grid-cols-6 xl:grid-cols-8"
            />
          </div>

          <div className="col-span-4 space-y-3">
            <h2 className="text-[10px] uppercase font-serif tracking-[0.2em] font-bold text-[#E2B646]">
              {t('watch.tools_label')}
            </h2>
            <FocusableButton
              onClick={toggleFavorite}
              className={`w-full flex items-center gap-2 px-4 py-3 border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${isFavorited
                ? 'border-[#E2B646]/30 bg-[#E2B646]/10 text-[#E2B646]'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                }`}
            >
              <Heart size={14} className={isFavorited ? 'fill-[#E2B646]' : ''} />
              {isFavorited ? t('movie.pinned') : t('movie.pin')}
            </FocusableButton>

            <FocusableButton
              onClick={toggleReminder}
              className={`w-full flex items-center gap-2 px-4 py-3 border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${isReminded
                ? 'border-[#E2B646]/30 bg-[#E2B646]/10 text-[#E2B646]'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                }`}
            >
              {isReminded ? <BellOff size={14} /> : <Bell size={14} />}
              {isReminded ? (language === 'vi' ? 'Bỏ Nhắc' : 'Unremind') : (language === 'vi' ? 'Nhắc Xem' : 'Remind Me')}
            </FocusableButton>

            <FocusableButton
              onClick={handleDownload}
              className="w-full flex items-center gap-2 px-4 py-3 border border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Download size={14} />
              {t('watch.download')}
            </FocusableButton>

            <WatchPartyToggle
              movieSlug={slug}
              episodeSlug={episodeSlug}
              initialJoinCode={autoJoinCode}
              currentTime={player.currentTime}
              isPlaying={player.isPlaying}
            />
          </div>
        </div>

        <TVMovieShelf title={t('watch.related_movies')} movies={recommended} />
      </main>
    </div>
  );
}

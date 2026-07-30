'use client';

import { RefObject } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Bell, BellOff, Star, MoveLeft, Lock, Unlock, Download } from 'lucide-react';
import { MovieDetail, ServerEpisode, ServerData } from '@/lib/api';
import { AnimeInfo, translateAnimeStatus, formatNextAiringTime } from '@/lib/anime';
import type { Language } from '@/hooks/useLanguage';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { useWatchParty } from '@/hooks/useWatchParty';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
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

const noop = () => { };
const noopSeek = (_e: React.ChangeEvent<HTMLInputElement>) => { };

export interface WatchPagePCProps {
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
  animeInfo: AnimeInfo | null;
  isAnime: boolean;

  player: ReturnType<typeof useVideoPlayer>;
  videoRef: RefObject<HTMLVideoElement | null>;
  playerContainerRef: RefObject<HTMLDivElement | null>;
  effectsCanvasRef: RefObject<HTMLCanvasElement | null>;
  canControlVideo: boolean;
  handleTimeUpdate: () => void;

  isTheaterMode: boolean;
  setIsTheaterMode: (value: boolean | ((prev: boolean) => boolean)) => void;

  isBuffering: boolean;
  setIsBuffering: (value: boolean) => void;
  playerError: string | null;
  setPlayerError: (value: string | null) => void;
  setRetryNonce: (value: number | ((prev: number) => number)) => void;

  isSharpenEnabled: boolean;
  setIsSharpenEnabled: (value: boolean | ((prev: boolean) => boolean)) => void;
  showEffectsCanvas: boolean;
  webgpuSupported: boolean;
  fsrError: string | null;
  frameInterpolationError: string | null;
  audioError: string | null;

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
}

export default function WatchPagePC(props: WatchPagePCProps) {
  const {
    t, language, slug, episodeSlug,
    movie, episodes, activeServerIdx, handleServerChange, currentEpisode, nextEpisode, animeInfo, isAnime,
    player, videoRef, playerContainerRef, effectsCanvasRef, canControlVideo, handleTimeUpdate,
    isTheaterMode, setIsTheaterMode,
    isBuffering, setIsBuffering, playerError, setPlayerError, setRetryNonce,
    isSharpenEnabled, setIsSharpenEnabled, showEffectsCanvas, webgpuSupported, fsrError, frameInterpolationError, audioError,
    showAutoNext, setShowAutoNext, autoNextCounter, handleNextEpisodeLaunch, handleVideoEnded,
    showSkipIntroPrompt, handleSkipOpEd, setIntroDismissedForEpisode,
    partyRoomCode, party, autoJoinCode,
    isFavorited, toggleFavorite, isReminded, toggleReminder,
  } = props;

  const handleDownload = () => {
    window.open(`/download/${slug}/${episodeSlug}?server=${activeServerIdx}`, '_blank', 'noopener,noreferrer');
  };

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
                <MoveLeft size={11} />
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
                style={{ cursor: player.showControls ? 'default' : 'none' }}
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

                <AnimatePresence>
                  {player.showControls && !playerError && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={(e) => { if (e.detail === 2) player.toggleLock(); }}
                      className={`absolute top-1/2 left-3 -translate-y-1/2 z-30 p-2 rounded-full border cursor-pointer ${player.isLocked
                        ? 'bg-[#E2B646]/90 border-[#E2B646] text-black'
                        : 'bg-black/40 border-zinc-700 text-zinc-300 hover:text-white'
                        }`}
                      title={player.isLocked ? t('watch.unlock_screen') : t('watch.lock_screen')}
                    >
                      {player.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </motion.button>
                  )}
                </AnimatePresence>

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
                        fsrError={fsrError}
                        frameInterpolationError={frameInterpolationError}
                        audioError={audioError}
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
          </div>

          <div className="col-span-1 lg:col-span-4 space-y-6">
            <StreamSidebar
              episodes={episodes}
              activeServerIdx={activeServerIdx}
              onServerChange={handleServerChange}
              slug={slug}
              episodeSlug={episodeSlug}
            />

            <WatchPartyToggle
              movieSlug={slug}
              episodeSlug={episodeSlug}
              initialJoinCode={autoJoinCode}
              currentTime={player.currentTime}
              isPlaying={player.isPlaying}
            />
          </div>

          <div className="col-span-1 lg:col-span-8 space-y-4">
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

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-[#E2B646]/40 text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Download size={12} />
                  <span>{t('watch.download')}</span>
                </button>
              </div>

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
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

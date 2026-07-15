'use client';

import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Expand, Shrink, Layers, SkipForward } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import PlayerSettingsPopover from './PlayerSettingsPopover';

interface PlayerControlBarProps {
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  formatTime: (secs: number) => string;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;

  isPlaying: boolean;
  onPlayToggle: () => void;

  isMuted: boolean;
  volume: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMuteToggle: () => void;

  showAnimeSkip: boolean;
  onSkipOpEd: () => void;

  isSharpenEnabled: boolean;
  onToggleSharpen: () => void;
  playbackRate: number;
  onSetRate: (rate: number) => void;

  isPipAvailable: boolean;
  onTriggerPip: () => void;

  isFullscreen: boolean;
  onFullscreenToggle: () => void;

  isTheaterMode: boolean;
  onTheaterToggle: () => void;

  webgpuSupported: boolean;
  fsrError: string | null;
  frameInterpolationError: string | null;
  audioError: string | null;
}

export default function PlayerControlBar({
  currentTime, duration, bufferedEnd, formatTime,
  onSeek, onSeekStart, onSeekEnd,
  isPlaying, onPlayToggle,
  isMuted, volume, onVolumeChange, onMuteToggle,
  showAnimeSkip, onSkipOpEd,
  isSharpenEnabled, onToggleSharpen, playbackRate, onSetRate,
  isPipAvailable, onTriggerPip,
  isFullscreen, onFullscreenToggle,
  isTheaterMode, onTheaterToggle,
  webgpuSupported, fsrError, frameInterpolationError, audioError,
}: PlayerControlBarProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3 controls-deck">
      {/* Interactive Timeline seek bar */}
      <div className="flex items-center space-x-3 text-xs font-mono font-bold text-zinc-400">
        <span>{formatTime(currentTime)}</span>
        <div className="relative flex-1 h-1">
          <div className="absolute inset-0 bg-zinc-800 pointer-events-none" />
          <div
            className="absolute inset-y-0 left-0 bg-zinc-600 pointer-events-none"
            style={{ width: `${duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={onSeek}
            onMouseDown={onSeekStart}
            onMouseUp={onSeekEnd}
            onTouchStart={onSeekStart}
            onTouchEnd={onSeekEnd}
            className="absolute inset-0 w-full h-1 accent-[#E2B646] rounded-none cursor-pointer bg-transparent"
          />
        </div>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Button Panel (Play, Volume, PiP, Fullscreen, Speed/Settings) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onPlayToggle}
            className="p-1.5 hover:bg-zinc-800/50 rounded-none text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-current" />}
          </button>

          <div className="flex items-center space-x-2 group/volume">
            <button
              onClick={onMuteToggle}
              className="p-1.5 hover:bg-zinc-800/50 rounded-none text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={isMuted ? 0 : volume}
              onChange={onVolumeChange}
              className="w-16 accent-[#E2B646] h-1 rounded-none cursor-pointer bg-zinc-800 opacity-0 group-hover/volume:opacity-100 transition-opacity"
            />
          </div>

          {showAnimeSkip && (
            <button
              onClick={onSkipOpEd}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-yellow-500/10 border border-[#E2B646]/30 hover:border-[#E2B646] text-[#E2B646] text-[10px] font-mono font-black tracking-widest uppercase cursor-pointer transition-all"
              title="Skip Opening / Ending (90s)"
            >
              <SkipForward size={11} />
              <span>{t('player.skip_op_ed')}</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-zinc-400">
          <PlayerSettingsPopover
            isSharpenEnabled={isSharpenEnabled}
            onToggleSharpen={onToggleSharpen}
            playbackRate={playbackRate}
            onSetRate={onSetRate}
            webgpuSupported={webgpuSupported}
            fsrError={fsrError}
            frameInterpolationError={frameInterpolationError}
            audioError={audioError}
          />

          {isPipAvailable && (
            <button
              onClick={onTriggerPip}
              className="p-1.5 hover:bg-zinc-800/50 rounded-none text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Picture in Picture"
            >
              <Layers size={16} />
            </button>
          )}

          <button
            onClick={onTheaterToggle}
            className={`p-1.5 hover:bg-zinc-800/50 rounded-none transition-colors cursor-pointer ${isTheaterMode ? 'text-[#E2B646]' : 'text-zinc-300 hover:text-white'}`}
            title="Theater Mode"
          >
            {isTheaterMode ? <Shrink size={16} /> : <Expand size={16} />}
          </button>

          <button
            onClick={onFullscreenToggle}
            className="p-1.5 hover:bg-zinc-800/50 rounded-none text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

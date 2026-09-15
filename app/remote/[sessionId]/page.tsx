'use client';

import { useState, useEffect, use } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  SkipForward,
  SkipBack,
  Tv,
  Wifi,
  Smartphone,
} from 'lucide-react';
import type { PlaybackState, RemoteAction } from '@/lib/remote/types';
import { subscribeToPlayerState, sendRemoteCommand as dispatchFirebaseCommand } from '@/lib/remote/firebaseRemote';

export default function RemotePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [state, setState] = useState<PlaybackState>({
    sessionId,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    lastUpdated: 0,
  });
  const [connected, setConnected] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
  };

  const sendCommand = (action: RemoteAction, value?: number) => {
    triggerHaptic();
    dispatchFirebaseCommand(sessionId, action, value);
  };

  // Real-time push listener for player state via Firebase (WebSockets, instant & zero HTTP polling spam)
  useEffect(() => {
    const unsubscribe = subscribeToPlayerState(sessionId, (remoteState) => {
      setState((prev) => ({
        ...prev,
        ...remoteState,
      }));
      setConnected(true);
    });
    return () => unsubscribe();
  }, [sessionId]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const displayTime = isScrubbing ? scrubTime : state.currentTime;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-between p-3 sm:p-4 max-w-sm sm:max-w-md mx-auto select-none touch-manipulation">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between border-b border-zinc-850 pb-2 sm:pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1 sm:p-1.5 bg-[#E2B646]/10 border border-[#E2B646]/30 text-[#E2B646]">
            <Smartphone size={14} className="sm:w-4 sm:h-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-serif font-black tracking-wider uppercase text-white">
              Konnn&apos;s Remote
            </h1>
            <div className="flex items-center space-x-1 mt-0.5">
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  connected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
                }`}
              />
              <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400">
                {connected ? 'Đã kết nối thiết bị' : 'Đang tìm kiếm...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-zinc-900 border border-zinc-800 text-[9px] sm:text-[10px] font-mono text-[#E2B646]">
          <Wifi size={11} />
          <span>Wi-Fi</span>
        </div>
      </div>

      {/* Now Playing Info Card */}
      <div className="w-full my-2 sm:my-3 p-2.5 sm:p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-none text-center relative overflow-hidden">
        <div className="flex items-center justify-center space-x-1.5 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#E2B646] mb-0.5">
          <Tv size={11} />
          <span>Đang phát trên màn hình</span>
        </div>
        <h2 className="text-xs sm:text-sm font-serif font-black text-white truncate max-w-[260px] sm:max-w-xs mx-auto">
          {state.movieTitle || 'Đang chờ phim...'}
        </h2>
        <p className="text-[10px] sm:text-xs font-mono text-zinc-400 mt-0.5">
          {state.episodeName ? `Tập: ${state.episodeName}` : 'Chưa chọn tập'}
        </p>
      </div>

      {/* Timeline Scrubber */}
      <div className="w-full space-y-1 sm:space-y-1.5 px-1">
        <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono text-zinc-400">
          <span>{formatTime(displayTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={state.duration || 100}
          step={1}
          value={displayTime}
          onTouchStart={() => setIsScrubbing(true)}
          onMouseDown={() => setIsScrubbing(true)}
          onChange={(e) => setScrubTime(parseFloat(e.target.value))}
          onTouchEnd={() => {
            setIsScrubbing(false);
            sendCommand('seekTo', scrubTime);
          }}
          onMouseUp={() => {
            setIsScrubbing(false);
            sendCommand('seekTo', scrubTime);
          }}
          className="w-full h-1.5 sm:h-2 accent-[#E2B646] bg-zinc-800 rounded-none cursor-pointer"
        />
      </div>

      {/* Main Playback Controls Deck (Compacted to ~230px width, prevents button overflow) */}
      <div className="w-full my-3 sm:my-5 flex flex-col items-center">
        <div className="flex items-center justify-center gap-1.5 sm:gap-3">
          {/* Previous Episode */}
          <button
            onClick={() => sendCommand('prevEpisode')}
            className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 active:scale-90 transition-all cursor-pointer"
            title="Tập trước"
          >
            <SkipBack size={15} className="sm:w-4 sm:h-4" />
          </button>

          {/* Jump -10s */}
          <button
            onClick={() => sendCommand('seekBy', -10)}
            className="w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 hover:border-[#E2B646]/50 text-zinc-300 active:scale-90 transition-all cursor-pointer"
            title="Tua lùi 10s"
          >
            <RotateCcw size={15} className="sm:w-4 sm:h-4" />
            <span className="text-[7px] sm:text-[8px] font-mono font-bold leading-none mt-0.5">-10s</span>
          </button>

          {/* Scaled Play/Pause Button (52px on mobile instead of 80px) */}
          <button
            onClick={() => {
              setState((s) => ({ ...s, isPlaying: !s.isPlaying }));
              sendCommand('togglePlay');
            }}
            className="w-13 h-13 sm:w-16 sm:h-16 bg-[#E2B646] text-black flex items-center justify-center shadow-lg shadow-[#E2B646]/20 active:scale-90 transition-all cursor-pointer rounded-full shrink-0"
            title={state.isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {state.isPlaying ? (
              <Pause size={22} className="fill-current sm:w-7 sm:h-7" />
            ) : (
              <Play size={22} className="fill-current ml-0.5 sm:w-7 sm:h-7" />
            )}
          </button>

          {/* Jump +10s */}
          <button
            onClick={() => sendCommand('seekBy', 10)}
            className="w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 hover:border-[#E2B646]/50 text-zinc-300 active:scale-90 transition-all cursor-pointer"
            title="Tua tới 10s"
          >
            <RotateCw size={15} className="sm:w-4 sm:h-4" />
            <span className="text-[7px] sm:text-[8px] font-mono font-bold leading-none mt-0.5">+10s</span>
          </button>

          {/* Next Episode */}
          <button
            onClick={() => sendCommand('nextEpisode')}
            className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 active:scale-90 transition-all cursor-pointer"
            title="Tập tiếp theo"
          >
            <SkipForward size={15} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Volume Deck */}
      <div className="w-full bg-zinc-900/50 border border-zinc-850 p-2.5 sm:p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-mono text-zinc-300">
            {state.isMuted || state.volume === 0 ? (
              <VolumeX size={14} className="text-[#E2B646]" />
            ) : state.volume < 0.5 ? (
              <Volume1 size={14} className="text-[#E2B646]" />
            ) : (
              <Volume2 size={14} className="text-[#E2B646]" />
            )}
            <span>Âm lượng</span>
          </div>
          <span className="text-[11px] sm:text-xs font-mono font-bold text-[#E2B646]">
            {state.isMuted ? 'Tắt tiếng' : `${Math.round(state.volume * 100)}%`}
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => {
              setState((s) => ({ ...s, isMuted: !s.isMuted }));
              sendCommand('mute');
            }}
            className="px-2 py-1 bg-zinc-850 border border-zinc-750 text-[10px] sm:text-xs font-mono text-zinc-300 active:scale-95 cursor-pointer"
          >
            {state.isMuted ? 'Bật âm' : 'Mute'}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={state.isMuted ? 0 : state.volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setState((s) => ({ ...s, volume: val, isMuted: val === 0 }));
              sendCommand('volume', val);
            }}
            className="flex-1 h-1.5 sm:h-2 accent-[#E2B646] bg-zinc-800 rounded-none cursor-pointer"
          />
        </div>
      </div>

      {/* Secondary Bottom Controls */}
      <div className="w-full pt-2.5 sm:pt-3 flex items-center justify-between gap-2">
        <button
          onClick={() => sendCommand('toggleFullscreen')}
          className="flex-1 flex items-center justify-center space-x-1.5 py-2 sm:py-2.5 bg-zinc-900 border border-zinc-800 text-[11px] sm:text-xs font-mono text-zinc-300 active:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Maximize size={13} />
          <span>Toàn màn hình TV</span>
        </button>
      </div>

      <div className="text-[9px] font-mono text-zinc-500 pt-1.5 text-center">
        ID: {sessionId.slice(0, 8)} • Konnn&apos;s Cinema Wi-Fi Remote
      </div>
    </div>
  );
}

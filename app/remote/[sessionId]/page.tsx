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
import type { PlaybackState } from '@/lib/remote/types';

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

  const sendCommand = async (action: string, value?: number) => {
    triggerHaptic();
    try {
      await fetch(`/api/remote/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'command', action, value }),
      });
    } catch (err) {
      console.error('Failed to send remote command:', err);
    }
  };

  // Poll player state every 1.2s
  useEffect(() => {
    let mounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/remote/${sessionId}?client=phone`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.state) {
            setState((prev) => ({
              ...prev,
              ...data.state,
            }));
            setConnected(true);
          }
        }
      } catch {
        if (mounted) setConnected(false);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1200);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
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
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-between p-4 max-w-md mx-auto select-none touch-manipulation">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between border-b border-zinc-850 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-[#E2B646]/10 border border-[#E2B646]/30 text-[#E2B646]">
            <Smartphone size={16} />
          </div>
          <div>
            <h1 className="text-sm font-serif font-black tracking-wider uppercase text-white">
              Konnn&apos;s Remote
            </h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
                }`}
              />
              <span className="text-[10px] font-mono text-zinc-400">
                {connected ? 'Đã kết nối thiết bị' : 'Đang tìm kiếm...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-[#E2B646]">
          <Wifi size={12} />
          <span>Wi-Fi</span>
        </div>
      </div>

      {/* Now Playing Info Card */}
      <div className="w-full my-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-none text-center relative overflow-hidden">
        <div className="flex items-center justify-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-[#E2B646] mb-1">
          <Tv size={13} />
          <span>Đang phát trên màn hình</span>
        </div>
        <h2 className="text-base font-serif font-black text-white truncate max-w-xs mx-auto">
          {state.movieTitle || 'Đang chờ phim...'}
        </h2>
        <p className="text-xs font-mono text-zinc-400 mt-0.5">
          {state.episodeName ? `Tập: ${state.episodeName}` : 'Chưa chọn tập'}
        </p>
      </div>

      {/* Timeline Scrubber */}
      <div className="w-full space-y-2 px-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
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
          className="w-full h-2 accent-[#E2B646] bg-zinc-800 rounded-none cursor-pointer"
        />
      </div>

      {/* Main Playback Controls Deck */}
      <div className="w-full my-6 flex flex-col items-center gap-6">
        <div className="flex items-center justify-center gap-6">
          {/* Previous Episode */}
          <button
            onClick={() => sendCommand('prevEpisode')}
            className="p-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 active:scale-95 transition-all cursor-pointer"
            title="Tập trước"
          >
            <SkipBack size={20} />
          </button>

          {/* Jump -10s */}
          <button
            onClick={() => sendCommand('seekBy', -10)}
            className="flex flex-col items-center justify-center p-3.5 bg-zinc-900 border border-zinc-800 hover:border-[#E2B646]/50 text-zinc-300 active:scale-95 transition-all cursor-pointer"
            title="Tua lùi 10s"
          >
            <RotateCcw size={22} />
            <span className="text-[9px] font-mono font-bold mt-0.5">-10s</span>
          </button>

          {/* Giant Play/Pause Button */}
          <button
            onClick={() => {
              setState((s) => ({ ...s, isPlaying: !s.isPlaying }));
              sendCommand('togglePlay');
            }}
            className="w-20 h-20 bg-[#E2B646] text-black flex items-center justify-center shadow-lg shadow-[#E2B646]/20 active:scale-90 transition-all cursor-pointer rounded-full"
            title={state.isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {state.isPlaying ? (
              <Pause size={34} className="fill-current" />
            ) : (
              <Play size={34} className="fill-current ml-1" />
            )}
          </button>

          {/* Jump +10s */}
          <button
            onClick={() => sendCommand('seekBy', 10)}
            className="flex flex-col items-center justify-center p-3.5 bg-zinc-900 border border-zinc-800 hover:border-[#E2B646]/50 text-zinc-300 active:scale-95 transition-all cursor-pointer"
            title="Tua tới 10s"
          >
            <RotateCw size={22} />
            <span className="text-[9px] font-mono font-bold mt-0.5">+10s</span>
          </button>

          {/* Next Episode */}
          <button
            onClick={() => sendCommand('nextEpisode')}
            className="p-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 active:scale-95 transition-all cursor-pointer"
            title="Tập tiếp theo"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* Volume Deck */}
      <div className="w-full bg-zinc-900/50 border border-zinc-850 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-mono text-zinc-300">
            {state.isMuted || state.volume === 0 ? (
              <VolumeX size={16} className="text-[#E2B646]" />
            ) : state.volume < 0.5 ? (
              <Volume1 size={16} className="text-[#E2B646]" />
            ) : (
              <Volume2 size={16} className="text-[#E2B646]" />
            )}
            <span>Âm lượng</span>
          </div>
          <span className="text-xs font-mono font-bold text-[#E2B646]">
            {state.isMuted ? 'Tắt tiếng' : `${Math.round(state.volume * 100)}%`}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setState((s) => ({ ...s, isMuted: !s.isMuted }));
              sendCommand('mute');
            }}
            className="px-3 py-2 bg-zinc-850 border border-zinc-750 text-xs font-mono text-zinc-300 active:scale-95"
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
            className="flex-1 h-2 accent-[#E2B646] bg-zinc-800 rounded-none cursor-pointer"
          />
        </div>
      </div>

      {/* Secondary Bottom Controls */}
      <div className="w-full pt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => sendCommand('toggleFullscreen')}
          className="flex-1 flex items-center justify-center space-x-2 py-3 bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 active:bg-zinc-800 transition-colors"
        >
          <Maximize size={15} />
          <span>Toàn màn hình</span>
        </button>
      </div>

      <div className="text-[10px] font-mono text-zinc-550 pt-2 text-center">
        ID: {sessionId.slice(0, 8)} • Konnn&apos;s Cinema Wi-Fi Remote
      </div>
    </div>
  );
}

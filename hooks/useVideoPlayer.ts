'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore, RefObject } from 'react';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';

const noopSubscribe = () => () => {};

// Taps only toggle play/pause inside this centered 50%x50% box; outside it
// they toggle control visibility instead (avoids mis-taps near edges pausing playback).
const CENTER_TAP_ZONE_MARGIN = 0.25;

function getPipSnapshot() {
  return typeof document !== 'undefined' && document.pictureInPictureEnabled;
}
function getPipServerSnapshot() {
  return false;
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia('(pointer: coarse)').matches;
}

// lock() is experimental/Chromium-only, missing from TS's DOM lib (unlike unlock()).
type OrientationLockable = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

interface UseVideoPlayerOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useVideoPlayer({ videoRef, containerRef }: UseVideoPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Seeded from usePreferencesStore so volume/mute/speed carry over between
  // videos instead of resetting to defaults on every mount.
  const [volume, setVolume] = useState(() => usePreferencesStore.getState().playerVolume);
  const [isMuted, setIsMuted] = useState(() => usePreferencesStore.getState().playerMuted);
  const [playbackRate, setPlaybackRate] = useState(() => usePreferencesStore.getState().playerDefaultSpeed);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isPipAvailable = useSyncExternalStore(noopSubscribe, getPipSnapshot, getPipServerSnapshot);
  const [showControls, setShowControls] = useState(true);
  const [skipFeedback, setSkipFeedback] = useState<'forward' | 'backward' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [bufferedEnd, setBufferedEnd] = useState(0);

  const isScrubbingRef = useRef(false);
  // True only when fullscreen was entered via rotation, not a manual tap --
  // so rotating back to portrait doesn't exit a manually-entered fullscreen.
  const autoFullscreenRef = useRef(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) autoFullscreenRef.current = false;
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // useState initial values only seed React state, not the actual DOM
  // element's defaults (volume=1, muted=false, rate=1) -- push once on mount.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackRate;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile: rotating to landscape auto-fullscreens, rotating back exits.
  useEffect(() => {
    if (!isMobileDevice()) return;
    const mql = window.matchMedia('(orientation: landscape)');

    const handleOrientationChange = () => {
      const container = containerRef.current;
      if (!container) return;
      if (mql.matches) {
        if (!document.fullscreenElement) {
          autoFullscreenRef.current = true;
          container.requestFullscreen?.()?.catch(() => { autoFullscreenRef.current = false; });
        }
      } else if (document.fullscreenElement && autoFullscreenRef.current) {
        document.exitFullscreen?.().catch(() => {});
      }
    };

    mql.addEventListener('change', handleOrientationChange);
    return () => mql.removeEventListener('change', handleOrientationChange);
  }, [containerRef]);

  const triggerSkipFeedback = useCallback((dir: 'forward' | 'backward') => {
    setSkipFeedback(dir);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setSkipFeedback(null), 600);
  }, []);

  const seekBy = useCallback((deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.min(video.duration || Infinity, Math.max(0, video.currentTime + deltaSeconds));
    video.currentTime = next;
    setCurrentTime(next);
    triggerSkipFeedback(deltaSeconds >= 0 ? 'forward' : 'backward');
  }, [videoRef, triggerSkipFeedback]);

  const handlePlayToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch((err) => console.error('Failed to trigger video playback:', err));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [videoRef]);

  const updateBufferedEnd = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.buffered.length === 0) return;
    setBufferedEnd(video.buffered.end(video.buffered.length - 1));
  }, [videoRef]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isScrubbingRef.current) return;
    setCurrentTime(video.currentTime);
    updateBufferedEnd();
  }, [videoRef, updateBufferedEnd]);

  const handleDurationChange = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, [videoRef]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (video) video.currentTime = seekTime;
  }, [videoRef]);

  const handleSeekStart = useCallback(() => {
    isScrubbingRef.current = true;
  }, []);

  const handleSeekEnd = useCallback(() => {
    isScrubbingRef.current = false;
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const vol = parseFloat(e.target.value);
    const muted = vol === 0;
    setVolume(vol);
    setIsMuted(muted);
    if (video) {
      video.volume = vol;
      video.muted = muted;
    }
    usePreferencesStore.getState().setPlayerVolume(vol);
    usePreferencesStore.getState().setPlayerMuted(muted);
  }, [videoRef]);

  const handleMuteToggle = useCallback(() => {
    const video = videoRef.current;
    setIsMuted((prev) => {
      const next = !prev;
      if (video) video.muted = next;
      usePreferencesStore.getState().setPlayerMuted(next);
      return next;
    });
  }, [videoRef]);

  const setRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    usePreferencesStore.getState().setPlayerDefaultSpeed(rate);
  }, [videoRef]);

  const handleFullscreenToggle = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (!document.fullscreenElement) {
        // Some browsers/contexts (permission-policy-restricted iframes, older
        // UAs) either omit requestFullscreen or return undefined instead of a
        // rejecting Promise on failure -- guard both instead of assuming a
        // spec-compliant Promise comes back.
        const result = container.requestFullscreen?.();
        const afterEnter = () => {
          setIsFullscreen(true);
          // Best-effort landscape lock on mobile; unsupported on iOS Safari.
          if (isMobileDevice()) {
            (screen.orientation as OrientationLockable | undefined)?.lock?.('landscape').catch(() => {});
          }
        };
        if (result && typeof result.then === 'function') {
          result.then(afterEnter).catch((err) => console.error('Failed to launch Fullscreen:', err));
        } else {
          afterEnter();
        }
      } else {
        const result = document.exitFullscreen?.();
        const afterExit = () => {
          setIsFullscreen(false);
          try { screen.orientation?.unlock?.(); } catch { /* unsupported, ignore */ }
        };
        if (result && typeof result.then === 'function') {
          result.then(afterExit).catch((err) => console.error('Failed to exit Fullscreen:', err));
        } else {
          afterExit();
        }
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  }, [containerRef]);

  const triggerPictureInPicture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isPipAvailable) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      video.requestPictureInPicture().catch((err) => console.error('Failed to trigger PiP:', err));
    }
  }, [videoRef, isPipAvailable]);

  const handleMouseMove = useCallback(() => {
    // Skip on touch: taps synthesize a mousemove right before click, which
    // raced with the tap-toggle in handlePlayerAreaClick (show then re-hide).
    if (isMobileDevice() || isLocked) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setIsPlaying((playing) => {
        if (playing) setShowControls(false);
        return playing;
      });
    }, 3000);
  }, [isLocked]);

  const toggleControlsVisibility = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls((prev) => {
      const next = !prev;
      if (next) {
        controlsTimeoutRef.current = setTimeout(() => {
          setIsPlaying((playing) => {
            if (playing) setShowControls(false);
            return playing;
          });
        }, 3000);
      }
      return next;
    });
  }, []);

  // Locking hides the overlay outright; unlocking brings it back with the
  // usual auto-hide-while-playing timer. Only the dedicated lock button
  // (double-click, kept outside this state) can flip it back.
  const toggleLock = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    setIsLocked((prev) => {
      const next = !prev;
      if (next) {
        setShowControls(false);
      } else {
        setShowControls(true);
        controlsTimeoutRef.current = setTimeout(() => {
          setIsPlaying((playing) => {
            if (playing) setShowControls(false);
            return playing;
          });
        }, 3000);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const handlePlayerAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.controls-deck')) {
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    e.preventDefault();

    if (isLocked) return;

    if (e.detail === 2) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      const rect = container.getBoundingClientRect();
      const isRightHalf = e.clientX - rect.left > rect.width / 2;
      seekBy(isRightHalf ? 10 : -10);
    } else if (e.detail === 1) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const insideCenterZone =
        x >= rect.width * CENTER_TAP_ZONE_MARGIN && x <= rect.width * (1 - CENTER_TAP_ZONE_MARGIN) &&
        y >= rect.height * CENTER_TAP_ZONE_MARGIN && y <= rect.height * (1 - CENTER_TAP_ZONE_MARGIN);

      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        if (insideCenterZone) {
          handlePlayToggle();
        } else {
          toggleControlsVisibility();
        }
        clickTimeoutRef.current = null;
      }, 250);
    }
  }, [containerRef, seekBy, handlePlayToggle, toggleControlsVisibility, isLocked]);

  // Keyboard shortcuts: space, arrows, F (fullscreen), M (mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      if (isLocked) return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayToggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(10);
          break;
        case 'ArrowUp': {
          e.preventDefault();
          const upVol = Math.min(1, video.volume + 0.1);
          video.volume = upVol;
          setVolume(upVol);
          setIsMuted(false);
          usePreferencesStore.getState().setPlayerVolume(upVol);
          usePreferencesStore.getState().setPlayerMuted(false);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const downVol = Math.max(0, video.volume - 0.1);
          const downMuted = downVol === 0;
          video.volume = downVol;
          setVolume(downVol);
          setIsMuted(downMuted);
          usePreferencesStore.getState().setPlayerVolume(downVol);
          usePreferencesStore.getState().setPlayerMuted(downMuted);
          break;
        }
        case 'KeyF':
          e.preventDefault();
          handleFullscreenToggle();
          break;
        case 'KeyM':
          e.preventDefault();
          handleMuteToggle();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoRef, handlePlayToggle, handleMuteToggle, handleFullscreenToggle, seekBy, isLocked]);

  const formatTime = useCallback((secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }, []);

  return {
    // state
    isPlaying, currentTime, duration, volume, isMuted, playbackRate,
    isFullscreen, isPipAvailable, showControls, skipFeedback, isLocked, bufferedEnd,
    // video element event bindings
    handleTimeUpdate, handleDurationChange, handleProgress: updateBufferedEnd,
    onPlaying: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    // controls
    handlePlayToggle, handleSeek, handleSeekStart, handleSeekEnd,
    handleVolumeChange, handleMuteToggle, setRate,
    handleFullscreenToggle, triggerPictureInPicture,
    handleMouseMove, handlePlayerAreaClick, seekBy, toggleLock,
    formatTime,
  };
}

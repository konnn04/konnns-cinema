'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore, RefObject } from 'react';

const noopSubscribe = () => () => {};

// A single tap only toggles play/pause inside this centered box (as a
// fraction of the container on each axis -- 0.25 margin leaves a 50%-wide,
// 50%-tall zone in the middle). Taps outside it just toggle control
// visibility instead, so mis-taps near the edges (common on mobile, where
// thumbs rest near the screen border) don't accidentally pause playback.
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

// Screen Orientation API's lock()/unlock() aren't in TS's DOM lib (still
// experimental/Chromium-only -- notably absent on iOS Safari, which has no
// equivalent and just relies on the OS's own rotation lock instead). Best
// effort only: failures are expected on unsupported browsers and swallowed.
type OrientationLockable = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

interface UseVideoPlayerOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useVideoPlayer({ videoRef, containerRef }: UseVideoPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isPipAvailable = useSyncExternalStore(noopSubscribe, getPipSnapshot, getPipServerSnapshot);
  const [showControls, setShowControls] = useState(true);
  const [skipFeedback, setSkipFeedback] = useState<'forward' | 'backward' | null>(null);

  const isScrubbingRef = useRef(false);
  // True only while the CURRENT fullscreen session was entered by rotation
  // (not a manual tap on the fullscreen button) -- lets the orientation
  // effect below know it's safe to auto-exit on rotating back to portrait,
  // without fighting a user who manually stayed in fullscreen.
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

  // Mobile only: rotating to landscape auto-fullscreens the player, rotating
  // back to portrait auto-exits -- but only for a fullscreen session THIS
  // effect started (see autoFullscreenRef above), so it doesn't yank someone
  // out of fullscreen they entered manually while happening to be portrait.
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

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isScrubbingRef.current) return;
    setCurrentTime(video.currentTime);
  }, [videoRef]);

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
    setVolume(vol);
    setIsMuted(vol === 0);
    if (video) {
      video.volume = vol;
      video.muted = vol === 0;
    }
  }, [videoRef]);

  const handleMuteToggle = useCallback(() => {
    const video = videoRef.current;
    setIsMuted((prev) => {
      const next = !prev;
      if (video) video.muted = next;
      return next;
    });
  }, [videoRef]);

  const setRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
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
          // Manually entering fullscreen on mobile should still land in
          // landscape, same as rotating there would -- best-effort only,
          // since orientation lock needs an active fullscreen element and
          // isn't supported at all on iOS Safari.
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
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setIsPlaying((playing) => {
        if (playing) setShowControls(false);
        return playing;
      });
    }, 3000);
  }, []);

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
  }, [containerRef, seekBy, handlePlayToggle, toggleControlsVisibility]);

  // Keyboard shortcuts: space, arrows, F (fullscreen), M (mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
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
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const downVol = Math.max(0, video.volume - 0.1);
          video.volume = downVol;
          setVolume(downVol);
          setIsMuted(downVol === 0);
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
  }, [videoRef, handlePlayToggle, handleMuteToggle, handleFullscreenToggle, seekBy]);

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
    isFullscreen, isPipAvailable, showControls, skipFeedback,
    // video element event bindings
    handleTimeUpdate, handleDurationChange,
    onPlaying: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    // controls
    handlePlayToggle, handleSeek, handleSeekStart, handleSeekEnd,
    handleVolumeChange, handleMuteToggle, setRate,
    handleFullscreenToggle, triggerPictureInPicture,
    handleMouseMove, handlePlayerAreaClick, seekBy,
    formatTime,
  };
}

'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore, RefObject } from 'react';

const noopSubscribe = () => () => {};

function getPipSnapshot() {
  return typeof document !== 'undefined' && document.pictureInPictureEnabled;
}
function getPipServerSnapshot() {
  return false;
}

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

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

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
        if (result && typeof result.then === 'function') {
          result.then(() => setIsFullscreen(true)).catch((err) => console.error('Failed to launch Fullscreen:', err));
        } else {
          setIsFullscreen(true);
        }
      } else {
        const result = document.exitFullscreen?.();
        if (result && typeof result.then === 'function') {
          result.then(() => setIsFullscreen(false)).catch((err) => console.error('Failed to exit Fullscreen:', err));
        } else {
          setIsFullscreen(false);
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
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        handlePlayToggle();
        clickTimeoutRef.current = null;
      }, 250);
    }
  }, [containerRef, seekBy, handlePlayToggle]);

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

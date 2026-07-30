'use client';

import { useEffect, useRef } from 'react';

interface UseMediaSessionOptions {
  title: string;
  artist?: string;
  artworkUrl?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
}

function isMediaSessionSupported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

export function useMediaSession({
  title, artist, artworkUrl, isPlaying, currentTime, duration, playbackRate,
  onPlay, onPause, onSeekBackward, onSeekForward, onPreviousTrack, onNextTrack,
}: UseMediaSessionOptions) {
  useEffect(() => {
    if (!isMediaSessionSupported()) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: artist || "Konnn's Cinema",
      artwork: artworkUrl
        ? [96, 128, 192, 256, 384, 512].map((size) => ({ src: artworkUrl, sizes: `${size}x${size}`, type: 'image/jpeg' }))
        : [],
    });
  }, [title, artist, artworkUrl]);

  useEffect(() => {
    if (!isMediaSessionSupported()) return;
    const ms = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ['play', onPlay],
      ['pause', onPause],
      ['seekbackward', onSeekBackward],
      ['seekforward', onSeekForward],
      ['previoustrack', onPreviousTrack ?? null],
      ['nexttrack', onNextTrack ?? null],
    ];
    handlers.forEach(([action, handler]) => {
      try { ms.setActionHandler(action, handler); } catch {}
    });
    return () => {
      handlers.forEach(([action]) => {
        try { ms.setActionHandler(action, null); } catch {}
      });
    };
  }, [onPlay, onPause, onSeekBackward, onSeekForward, onPreviousTrack, onNextTrack]);

  useEffect(() => {
    if (!isMediaSessionSupported()) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  const lastPositionUpdateRef = useRef(0);
  useEffect(() => {
    if (!isMediaSessionSupported() || !navigator.mediaSession.setPositionState) return;
    if (!duration || !isFinite(duration)) return;
    const now = Date.now();
    if (now - lastPositionUpdateRef.current < 1000) return;
    lastPositionUpdateRef.current = now;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(currentTime, duration),
        playbackRate: playbackRate || 1,
      });
    } catch {}
  }, [currentTime, duration, playbackRate]);
}

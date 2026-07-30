'use client';

import { useCallback, useRef, useState } from 'react';
import { downloadHlsToBlob } from '@/lib/hlsDownload';

export type HlsDownloadStatus = 'idle' | 'parsing' | 'downloading' | 'finalizing' | 'done' | 'error' | 'cancelled';

interface HlsDownloadProgress {
  completed: number;
  total: number;
  bytes: number;
}

export function useHlsDownload() {
  const [status, setStatus] = useState<HlsDownloadStatus>('idle');
  const [progress, setProgress] = useState<HlsDownloadProgress>({ completed: 0, total: 0, bytes: 0 });
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(async (playlistUrl: string, filename: string) => {
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus('parsing');
    setError(null);
    setProgress({ completed: 0, total: 0, bytes: 0 });

    try {
      const blob = await downloadHlsToBlob(playlistUrl, {
        signal: controller.signal,
        onSegmentsResolved: (total) => {
          setStatus('downloading');
          setProgress((p) => ({ ...p, total }));
        },
        onProgress: (completed, bytes) => {
          setProgress((p) => ({ ...p, completed, bytes }));
        },
      });

      setStatus('finalizing');
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus('cancelled');
        return;
      }
      console.error('HLS download failed:', err);
      setError(err instanceof Error ? err.message : 'Download failed');
      setStatus('error');
    }
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setProgress({ completed: 0, total: 0, bytes: 0 });
  }, []);

  return { status, progress, error, start, cancel, reset };
}

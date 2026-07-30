'use client';

import { useCallback, useRef, useState } from 'react';
import { downloadHlsToBlob, downloadHlsToStream } from '@/lib/hlsDownload';

export type HlsDownloadStatus =
  | 'idle'
  | 'choosing_location'
  | 'parsing'
  | 'downloading'
  | 'finalizing'
  | 'done'
  | 'error'
  | 'cancelled';

interface HlsDownloadProgress {
  completed: number;
  total: number;
  bytes: number;
}

function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

export function useHlsDownload() {
  const [status, setStatus] = useState<HlsDownloadStatus>('idle');
  const [progress, setProgress] = useState<HlsDownloadProgress>({ completed: 0, total: 0, bytes: 0 });
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const writableRef = useRef<FileSystemWritableFileStream | null>(null);

  const start = useCallback(async (playlistUrl: string, filename: string) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    writableRef.current = null;

    setError(null);
    setProgress({ completed: 0, total: 0, bytes: 0 });

    const onSegmentsResolved = (total: number) => {
      setStatus('downloading');
      setProgress((p) => ({ ...p, total }));
    };
    const onProgress = (completed: number, bytes: number) => {
      setProgress((p) => ({ ...p, completed, bytes }));
    };

    // Prefer streaming straight to disk (File System Access API, Chromium
    // only) so memory use stays bounded no matter how long/high-quality the
    // episode is; fall back to the in-RAM Blob path everywhere else
    // (Firefox, Safari/iOS all lack showSaveFilePicker).
    if (supportsFileSystemAccess()) {
      setStatus('choosing_location');
      let handle: FileSystemFileHandle;
      try {
        handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
        });
      } catch (err) {
        // User closed/cancelled the native save dialog -- not a failure.
        if (err instanceof DOMException && err.name === 'AbortError') {
          setStatus('cancelled');
          return;
        }
        console.error('Save file picker failed:', err);
        setError(err instanceof Error ? err.message : 'Could not open save dialog');
        setStatus('error');
        return;
      }

      setStatus('parsing');
      const writable = await handle.createWritable();
      writableRef.current = writable;

      try {
        await downloadHlsToStream(playlistUrl, writable, { signal: controller.signal, onSegmentsResolved, onProgress });
        await writable.close();
        setStatus('done');
      } catch (err) {
        await writable.abort().catch(() => {});
        if (controller.signal.aborted) {
          setStatus('cancelled');
          return;
        }
        console.error('HLS download failed:', err);
        setError(err instanceof Error ? err.message : 'Download failed');
        setStatus('error');
      } finally {
        writableRef.current = null;
      }
      return;
    }

    setStatus('parsing');
    try {
      const blob = await downloadHlsToBlob(playlistUrl, { signal: controller.signal, onSegmentsResolved, onProgress });

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
    writableRef.current?.abort().catch(() => {});
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setProgress({ completed: 0, total: 0, bytes: 0 });
  }, []);

  return { status, progress, error, start, cancel, reset };
}

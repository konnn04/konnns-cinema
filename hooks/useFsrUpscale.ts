'use client';

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { createUpscaleDriver, type UpscaleMode, type UpscaleDriver } from '@/lib/webgpu/upscale';

export type { UpscaleMode as FsrUpscaleMode } from '@/lib/webgpu/upscale';

interface UseFsrUpscaleOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  mode?: UpscaleMode;
  /** Called when the pipeline fails after having started -- caller should flip `enabled` back off. */
  onFatalError?: () => void;
}

// Owns the rvfc-driven render loop and error handling; the entire per-mode
// pipeline (WebGPU device/canvas setup, per-frame GPU work) is delegated to
// a driver from lib/webgpu/upscale/ picked by `mode` -- this hook doesn't
// need to know how any of them work internally.
// Controlled by the `enabled` prop, same reasoning as useAudioEnhancer.
export function useFsrUpscale({ videoRef, canvasRef, enabled, mode = 'sharpen', onFatalError }: UseFsrUpscaleOptions) {
  const [error, setError] = useState<string | null>(null);
  const isSupported = typeof navigator !== 'undefined' && !!navigator.gpu;

  const driverRef = useRef<UpscaleDriver | null>(null);
  const rvfcHandleRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const renderFrameRef = useRef<() => void>(() => {});

  const teardown = useCallback(() => {
    activeRef.current = false;
    const video = videoRef.current;
    if (rvfcHandleRef.current != null && video && 'cancelVideoFrameCallback' in video) {
      (video as any).cancelVideoFrameCallback(rvfcHandleRef.current);
    }
    rvfcHandleRef.current = null;

    driverRef.current?.destroy();
    driverRef.current = null;
  }, [videoRef]);

  const renderFrame = useCallback(async () => {
    if (!activeRef.current) return;
    const video = videoRef.current;
    const driver = driverRef.current;
    if (!video || !driver) return;

    try {
      await driver.renderFrame();
    } catch (err) {
      console.error('Upscale frame render failed, disabling:', err);
      setError('Video upscaling stopped unexpectedly and was turned off.');
      onFatalError?.();
      return;
    }

    if (activeRef.current && 'requestVideoFrameCallback' in video) {
      rvfcHandleRef.current = (video as any).requestVideoFrameCallback(() => renderFrameRef.current());
    }
  }, [videoRef, onFatalError]);

  useEffect(() => {
    renderFrameRef.current = renderFrame;
  }, [renderFrame]);

  const setup = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!isSupported) {
      setError('This browser does not support WebGPU.');
      return;
    }
    if (!video || !canvas) return;

    const driver = createUpscaleDriver(mode, { video, canvas });
    try {
      await driver.setup();
      driverRef.current = driver;
      activeRef.current = true;
      setError(null);

      if ('requestVideoFrameCallback' in video) {
        rvfcHandleRef.current = (video as any).requestVideoFrameCallback(() => renderFrame());
      } else {
        throw new Error('requestVideoFrameCallback is not supported in this browser');
      }
    } catch (err) {
      console.error('Failed to initialize upscale pipeline:', err);
      setError('This browser cannot run the upscaler (WebGPU init failed). Falling back to normal playback.');
      driver.destroy();
      teardown();
      onFatalError?.();
    }
  }, [videoRef, canvasRef, isSupported, mode, renderFrame, teardown, onFatalError]);

  useEffect(() => {
    if (enabled) {
      // setup() is an async WebGPU device bring-up; any setState it triggers
      // happens after its first `await`, never synchronously during this effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setup();
    } else {
      teardown();
    }
    return () => teardown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mode]);

  return { isSupported, error };
}

'use client';

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { createFrameInterpolationAlgorithm, BLIT_SHADER, type FrameInterpolationMode, type FrameInterpolationAlgorithm } from '@/lib/webgpu/frameInterpolation';

export type { FrameInterpolationMode } from '@/lib/webgpu/frameInterpolation';

interface Pipeline {
  device: GPUDevice;
  context: GPUCanvasContext;
  prevTexture: GPUTexture;
  currTexture: GPUTexture;
  algorithm: FrameInterpolationAlgorithm;
  blitPipeline: GPURenderPipeline;
  blitBindGroupCurr: GPUBindGroup;
  blitBindGroupInterp: GPUBindGroup;
  width: number;
  height: number;
}

interface UseFrameInterpolationOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  mode?: FrameInterpolationMode;
  /** Called when the pipeline fails after having started -- caller should flip `enabled` back off. */
  onFatalError?: () => void;
}

// Owns video ingestion (prev/curr texture shifting per real decoded frame),
// the display-refresh-rate presentation loop (picks real vs. generated
// midpoint frame), and canvas presentation. The actual interpolation
// algorithm is delegated to lib/webgpu/frameInterpolation/ per `mode` --
// this hook doesn't need to know how any of them work internally.
// Controlled by the `enabled` prop, same reasoning as useAudioEnhancer.
export function useFrameInterpolation({ videoRef, canvasRef, enabled, mode = 'motion', onFatalError }: UseFrameInterpolationOptions) {
  const [error, setError] = useState<string | null>(null);
  const isSupported = typeof navigator !== 'undefined' && !!navigator.gpu;

  const pipelineRef = useRef<Pipeline | null>(null);
  const rvfcHandleRef = useRef<number | null>(null);
  const rafHandleRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const lastRealFrameWallTimeRef = useRef(0);
  const frameIntervalEstimateRef = useRef(1000 / 24);
  const hasPrevRef = useRef(false);
  const onRealFrameRef = useRef<() => void>(() => {});
  const displayLoopRef = useRef<() => void>(() => {});

  const teardown = useCallback(() => {
    activeRef.current = false;
    const video = videoRef.current;
    if (rvfcHandleRef.current != null && video && 'cancelVideoFrameCallback' in video) {
      (video as any).cancelVideoFrameCallback(rvfcHandleRef.current);
    }
    rvfcHandleRef.current = null;
    if (rafHandleRef.current != null) {
      cancelAnimationFrame(rafHandleRef.current);
    }
    rafHandleRef.current = null;
    hasPrevRef.current = false;

    const pipeline = pipelineRef.current;
    if (pipeline) {
      pipeline.prevTexture.destroy();
      pipeline.currTexture.destroy();
      pipeline.algorithm.destroy();
      pipeline.device.destroy();
    }
    pipelineRef.current = null;
  }, [videoRef]);

  // Runs once per *real* decoded video frame: shifts curr->prev, ingests the
  // new frame, and recomputes the interpolated midpoint frame.
  const onRealFrame = useCallback(() => {
    if (!activeRef.current) return;
    const video = videoRef.current;
    const pipeline = pipelineRef.current;
    if (!video || !pipeline) return;

    try {
      const encoder = pipeline.device.createCommandEncoder();
      if (hasPrevRef.current) {
        encoder.copyTextureToTexture(
          { texture: pipeline.currTexture },
          { texture: pipeline.prevTexture },
          [pipeline.width, pipeline.height]
        );
      }
      pipeline.device.queue.submit([encoder.finish()]);

      pipeline.device.queue.copyExternalImageToTexture(
        { source: video },
        { texture: pipeline.currTexture },
        [pipeline.width, pipeline.height]
      );

      if (hasPrevRef.current) {
        const computeEncoder = pipeline.device.createCommandEncoder();
        pipeline.algorithm.encodePasses(computeEncoder);
        pipeline.device.queue.submit([computeEncoder.finish()]);
      }
      hasPrevRef.current = true;

      const now = performance.now();
      const delta = now - lastRealFrameWallTimeRef.current;
      if (lastRealFrameWallTimeRef.current > 0 && delta > 0 && delta < 500) {
        frameIntervalEstimateRef.current = delta;
      }
      lastRealFrameWallTimeRef.current = now;
    } catch (err) {
      console.error('Frame interpolation update failed, disabling:', err);
      setError('Frame interpolation stopped unexpectedly and was turned off.');
      onFatalError?.();
      return;
    }

    if (activeRef.current && 'requestVideoFrameCallback' in video) {
      rvfcHandleRef.current = (video as any).requestVideoFrameCallback(() => onRealFrameRef.current());
    }
  }, [videoRef, onFatalError]);

  useEffect(() => {
    onRealFrameRef.current = onRealFrame;
  }, [onRealFrame]);

  // Runs at display refresh rate: picks whichever texture (real "curr" frame
  // or the generated midpoint) should be on screen right now, roughly doubling
  // the perceived frame rate.
  const displayLoop = useCallback(() => {
    if (!activeRef.current) return;
    const pipeline = pipelineRef.current;
    if (pipeline) {
      const elapsed = performance.now() - lastRealFrameWallTimeRef.current;
      const showInterpolated = hasPrevRef.current && elapsed >= frameIntervalEstimateRef.current / 2;

      try {
        const encoder = pipeline.device.createCommandEncoder();
        const renderPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: pipeline.context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          }],
        });
        renderPass.setPipeline(pipeline.blitPipeline);
        renderPass.setBindGroup(0, showInterpolated ? pipeline.blitBindGroupInterp : pipeline.blitBindGroupCurr);
        renderPass.draw(3);
        renderPass.end();
        pipeline.device.queue.submit([encoder.finish()]);
      } catch (err) {
        console.error('Frame interpolation display loop failed, disabling:', err);
        setError('Frame interpolation stopped unexpectedly and was turned off.');
        onFatalError?.();
        return;
      }
    }
    rafHandleRef.current = requestAnimationFrame(() => displayLoopRef.current());
  }, [onFatalError]);

  useEffect(() => {
    displayLoopRef.current = displayLoop;
  }, [displayLoop]);

  const setup = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!isSupported) {
      setError('This browser does not support WebGPU.');
      return;
    }
    if (!video || !canvas) return;

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('No WebGPU adapter available');
      const device = await adapter.requestDevice();

      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('webgpu');
      if (!context) throw new Error('Failed to acquire WebGPU canvas context');
      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: 'opaque' });

      const makeFrameTexture = () => device.createTexture({
        size: [width, height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
          | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });

      const prevTexture = makeFrameTexture();
      const currTexture = makeFrameTexture();

      const algorithm = createFrameInterpolationAlgorithm(mode, { device, prevTexture, currTexture, width, height });

      const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
      const blitModule = device.createShaderModule({ code: BLIT_SHADER });
      const blitPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: blitModule, entryPoint: 'vs_main' },
        fragment: { module: blitModule, entryPoint: 'fs_main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });

      const blitBindGroupCurr = device.createBindGroup({
        layout: blitPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: currTexture.createView() },
        ],
      });
      const blitBindGroupInterp = device.createBindGroup({
        layout: blitPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: algorithm.interpTexture.createView() },
        ],
      });

      pipelineRef.current = {
        device, context, prevTexture, currTexture, algorithm,
        blitPipeline, blitBindGroupCurr, blitBindGroupInterp,
        width, height,
      };

      activeRef.current = true;
      hasPrevRef.current = false;
      lastRealFrameWallTimeRef.current = 0;
      setError(null);

      if ('requestVideoFrameCallback' in video) {
        rvfcHandleRef.current = (video as any).requestVideoFrameCallback(() => onRealFrame());
      } else {
        throw new Error('requestVideoFrameCallback is not supported in this browser');
      }
      rafHandleRef.current = requestAnimationFrame(displayLoop);
    } catch (err) {
      console.error('Failed to initialize frame interpolation pipeline:', err);
      setError('This browser cannot run frame interpolation (WebGPU init failed). Falling back to normal playback.');
      teardown();
      onFatalError?.();
    }
  }, [videoRef, canvasRef, isSupported, mode, onRealFrame, displayLoop, teardown, onFatalError]);

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

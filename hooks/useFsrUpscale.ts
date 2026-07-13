'use client';

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { EASU_SHADER, RCAS_SHADER, BLIT_SHADER } from '@/lib/webgpu/fsrShaders';

const MAX_DST_WIDTH = 1920;
const UPSCALE_FACTOR = 1.5;
const SHARPNESS = 0.2;

interface Pipeline {
  device: GPUDevice;
  context: GPUCanvasContext;
  sourceTexture: GPUTexture;
  easuOutputTexture: GPUTexture;
  rcasOutputTexture: GPUTexture;
  easuPipeline: GPUComputePipeline;
  rcasPipeline: GPUComputePipeline;
  blitPipeline: GPURenderPipeline;
  easuBindGroup: GPUBindGroup;
  rcasBindGroup: GPUBindGroup;
  blitBindGroup: GPUBindGroup;
  dstWidth: number;
  dstHeight: number;
  srcWidth: number;
  srcHeight: number;
}

interface UseFsrUpscaleOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  /** Called when the pipeline fails after having started -- caller should flip `enabled` back off. */
  onFatalError?: () => void;
}

// Controlled by the `enabled` prop, same reasoning as useAudioEnhancer.
export function useFsrUpscale({ videoRef, canvasRef, enabled, onFatalError }: UseFsrUpscaleOptions) {
  const [error, setError] = useState<string | null>(null);
  const isSupported = typeof navigator !== 'undefined' && !!navigator.gpu;

  const pipelineRef = useRef<Pipeline | null>(null);
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

    const pipeline = pipelineRef.current;
    if (pipeline) {
      pipeline.sourceTexture.destroy();
      pipeline.easuOutputTexture.destroy();
      pipeline.rcasOutputTexture.destroy();
      pipeline.device.destroy();
    }
    pipelineRef.current = null;
  }, [videoRef]);

  const renderFrame = useCallback(() => {
    if (!activeRef.current) return;
    const video = videoRef.current;
    const pipeline = pipelineRef.current;
    if (!video || !pipeline) return;

    const { device, context, sourceTexture, easuOutputTexture, rcasOutputTexture,
      easuPipeline, rcasPipeline, blitPipeline, easuBindGroup, rcasBindGroup, blitBindGroup,
      dstWidth, dstHeight, srcWidth, srcHeight } = pipeline;

    try {
      device.queue.copyExternalImageToTexture(
        { source: video },
        { texture: sourceTexture },
        [srcWidth, srcHeight]
      );

      const encoder = device.createCommandEncoder();

      const easuPass = encoder.beginComputePass();
      easuPass.setPipeline(easuPipeline);
      easuPass.setBindGroup(0, easuBindGroup);
      easuPass.dispatchWorkgroups(Math.ceil(dstWidth / 8), Math.ceil(dstHeight / 8));
      easuPass.end();

      const rcasPass = encoder.beginComputePass();
      rcasPass.setPipeline(rcasPipeline);
      rcasPass.setBindGroup(0, rcasBindGroup);
      rcasPass.dispatchWorkgroups(Math.ceil(dstWidth / 8), Math.ceil(dstHeight / 8));
      rcasPass.end();

      const renderPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      renderPass.setPipeline(blitPipeline);
      renderPass.setBindGroup(0, blitBindGroup);
      renderPass.draw(3);
      renderPass.end();

      device.queue.submit([encoder.finish()]);
    } catch (err) {
      console.error('FSR frame render failed, disabling upscale:', err);
      setError('Video upscaling stopped unexpectedly and was turned off.');
      onFatalError?.();
      return;
    }

    if (activeRef.current && 'requestVideoFrameCallback' in video) {
      rvfcHandleRef.current = (video as any).requestVideoFrameCallback(() => renderFrameRef.current());
    }
    // Silence unused-var lint for destructured fields only read above.
    void easuOutputTexture; void rcasOutputTexture;
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

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('No WebGPU adapter available');
      const device = await adapter.requestDevice();

      const srcWidth = video.videoWidth || 1280;
      const srcHeight = video.videoHeight || 720;
      const dstWidth = Math.min(Math.round(srcWidth * UPSCALE_FACTOR), MAX_DST_WIDTH);
      const dstHeight = Math.round(dstWidth * (srcHeight / srcWidth));

      canvas.width = dstWidth;
      canvas.height = dstHeight;

      const context = canvas.getContext('webgpu');
      if (!context) throw new Error('Failed to acquire WebGPU canvas context');
      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: 'opaque' });

      const sourceTexture = device.createTexture({
        size: [srcWidth, srcHeight],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
      const easuOutputTexture = device.createTexture({
        size: [dstWidth, dstHeight],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
      });
      const rcasOutputTexture = device.createTexture({
        size: [dstWidth, dstHeight],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
      });

      const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });

      const easuDimsBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(easuDimsBuffer, 0, new Float32Array([srcWidth, srcHeight, dstWidth, dstHeight]));

      const rcasParamsBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(rcasParamsBuffer, 0, new Float32Array([dstWidth, dstHeight, SHARPNESS, 0]));

      const easuModule = device.createShaderModule({ code: EASU_SHADER });
      const rcasModule = device.createShaderModule({ code: RCAS_SHADER });
      const blitModule = device.createShaderModule({ code: BLIT_SHADER });

      const easuPipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: easuModule, entryPoint: 'main' },
      });
      const rcasPipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: rcasModule, entryPoint: 'main' },
      });
      const blitPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: blitModule, entryPoint: 'vs_main' },
        fragment: { module: blitModule, entryPoint: 'fs_main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });

      const easuBindGroup = device.createBindGroup({
        layout: easuPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: sourceTexture.createView() },
          { binding: 2, resource: easuOutputTexture.createView() },
          { binding: 3, resource: { buffer: easuDimsBuffer } },
        ],
      });
      const rcasBindGroup = device.createBindGroup({
        layout: rcasPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: easuOutputTexture.createView() },
          { binding: 1, resource: rcasOutputTexture.createView() },
          { binding: 2, resource: { buffer: rcasParamsBuffer } },
        ],
      });
      const blitBindGroup = device.createBindGroup({
        layout: blitPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: rcasOutputTexture.createView() },
        ],
      });

      pipelineRef.current = {
        device, context, sourceTexture, easuOutputTexture, rcasOutputTexture,
        easuPipeline, rcasPipeline, blitPipeline, easuBindGroup, rcasBindGroup, blitBindGroup,
        dstWidth, dstHeight, srcWidth, srcHeight,
      };

      activeRef.current = true;
      setError(null);

      if ('requestVideoFrameCallback' in video) {
        rvfcHandleRef.current = (video as any).requestVideoFrameCallback(() => renderFrame());
      } else {
        throw new Error('requestVideoFrameCallback is not supported in this browser');
      }
    } catch (err) {
      console.error('Failed to initialize FSR upscale pipeline:', err);
      setError('This browser cannot run the upscaler (WebGPU init failed). Falling back to normal playback.');
      teardown();
      onFatalError?.();
    }
  }, [videoRef, canvasRef, isSupported, renderFrame, teardown, onFatalError]);

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
  }, [enabled]);

  return { isSupported, error };
}

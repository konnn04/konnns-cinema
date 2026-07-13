'use client';

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { MOTION_ESTIMATION_SHADER, INTERPOLATE_SHADER } from '@/lib/webgpu/frameInterpolationShaders';

const BLOCK_SIZE = 16;
const SEARCH_RADIUS = 8;

interface Pipeline {
  device: GPUDevice;
  context: GPUCanvasContext;
  prevTexture: GPUTexture;
  currTexture: GPUTexture;
  motionTexture: GPUTexture;
  interpTexture: GPUTexture;
  motionPipeline: GPUComputePipeline;
  interpPipeline: GPUComputePipeline;
  blitPipeline: GPURenderPipeline;
  motionBindGroup: GPUBindGroup;
  interpBindGroup: GPUBindGroup;
  blitBindGroupCurr: GPUBindGroup;
  blitBindGroupInterp: GPUBindGroup;
  width: number;
  height: number;
  blocksX: number;
  blocksY: number;
}

interface UseFrameInterpolationOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  /** Called when the pipeline fails after having started -- caller should flip `enabled` back off. */
  onFatalError?: () => void;
}

// Reuses the same fullscreen-triangle blit shader source as the FSR pipeline
// (kept inline here to avoid coupling the two BETA features together).
const BLIT_SHADER = /* wgsl */ `
struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOut {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0),
  );
  var out: VertexOut;
  out.position = vec4<f32>(pos[idx], 0.0, 1.0);
  out.uv = (pos[idx] * vec2<f32>(0.5, -0.5)) + vec2<f32>(0.5, 0.5);
  return out;
}

@group(0) @binding(0) var blitSampler: sampler;
@group(0) @binding(1) var blitTex: texture_2d<f32>;

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  return textureSampleLevel(blitTex, blitSampler, in.uv, 0.0);
}
`;

// Controlled by the `enabled` prop, same reasoning as useAudioEnhancer.
export function useFrameInterpolation({ videoRef, canvasRef, enabled, onFatalError }: UseFrameInterpolationOptions) {
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
      pipeline.motionTexture.destroy();
      pipeline.interpTexture.destroy();
      pipeline.device.destroy();
    }
    pipelineRef.current = null;
  }, [videoRef]);

  // Runs once per *real* decoded video frame: shifts curr->prev, ingests the
  // new frame, and recomputes motion vectors + the midpoint interpolated frame.
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
        const motionPass = computeEncoder.beginComputePass();
        motionPass.setPipeline(pipeline.motionPipeline);
        motionPass.setBindGroup(0, pipeline.motionBindGroup);
        motionPass.dispatchWorkgroups(Math.ceil(pipeline.blocksX / 8), Math.ceil(pipeline.blocksY / 8));
        motionPass.end();

        const interpPass = computeEncoder.beginComputePass();
        interpPass.setPipeline(pipeline.interpPipeline);
        interpPass.setBindGroup(0, pipeline.interpBindGroup);
        interpPass.dispatchWorkgroups(Math.ceil(pipeline.width / 8), Math.ceil(pipeline.height / 8));
        interpPass.end();

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

      const blocksX = Math.ceil(width / BLOCK_SIZE);
      const blocksY = Math.ceil(height / BLOCK_SIZE);

      const makeFrameTexture = () => device.createTexture({
        size: [width, height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
          | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });

      const prevTexture = makeFrameTexture();
      const currTexture = makeFrameTexture();
      const motionTexture = device.createTexture({
        size: [blocksX, blocksY],
        format: 'rg32float',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
      });
      const interpTexture = device.createTexture({
        size: [width, height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
      });

      const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });

      const motionParamsBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(motionParamsBuffer, 0, new Uint32Array([BLOCK_SIZE, SEARCH_RADIUS, blocksX, blocksY]));

      const interpParamsBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(interpParamsBuffer, 0, new Uint32Array([BLOCK_SIZE, width, height, 0]));

      const motionModule = device.createShaderModule({ code: MOTION_ESTIMATION_SHADER });
      const interpModule = device.createShaderModule({ code: INTERPOLATE_SHADER });
      const blitModule = device.createShaderModule({ code: BLIT_SHADER });

      const motionPipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: motionModule, entryPoint: 'main' },
      });
      const interpPipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: interpModule, entryPoint: 'main' },
      });
      const blitPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: blitModule, entryPoint: 'vs_main' },
        fragment: { module: blitModule, entryPoint: 'fs_main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });

      const motionBindGroup = device.createBindGroup({
        layout: motionPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: prevTexture.createView() },
          { binding: 1, resource: currTexture.createView() },
          { binding: 2, resource: motionTexture.createView() },
          { binding: 3, resource: { buffer: motionParamsBuffer } },
        ],
      });
      const interpBindGroup = device.createBindGroup({
        layout: interpPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: prevTexture.createView() },
          { binding: 1, resource: currTexture.createView() },
          { binding: 2, resource: motionTexture.createView() },
          { binding: 3, resource: interpTexture.createView() },
          { binding: 4, resource: { buffer: interpParamsBuffer } },
          { binding: 5, resource: sampler },
        ],
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
          { binding: 1, resource: interpTexture.createView() },
        ],
      });

      pipelineRef.current = {
        device, context, prevTexture, currTexture, motionTexture, interpTexture,
        motionPipeline, interpPipeline, blitPipeline,
        motionBindGroup, interpBindGroup, blitBindGroupCurr, blitBindGroupInterp,
        width, height, blocksX, blocksY,
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
  }, [videoRef, canvasRef, isSupported, onRealFrame, displayLoop, teardown, onFatalError]);

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

  const toggle = useCallback((next: boolean) => {
    if (next && !isSupported) {
      setError('This browser does not support WebGPU.');
      return;
    }
    setEnabled(next);
  }, [isSupported]);

  return { enabled, toggle, isSupported, error };
}

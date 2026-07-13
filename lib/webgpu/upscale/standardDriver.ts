import { createUpscaleAlgorithm } from './algorithms';
import { computeUpscaleDstDimensions } from './dimensions';
import { BLIT_SHADER } from './blitShader';
import type { CreateUpscaleDriverParams, UpscaleAlgorithm, UpscaleDriver, UpscaleMode } from './types';

interface StandardPipeline {
  device: GPUDevice;
  context: GPUCanvasContext;
  sourceTexture: GPUTexture;
  algorithm: UpscaleAlgorithm;
  blitPipeline: GPURenderPipeline;
  blitBindGroup: GPUBindGroup;
  srcWidth: number;
  srcHeight: number;
}

// Shared driver for every mode that fits the "copy video frame into a
// texture, run compute passes, blit result to canvas" shape ('sharpen',
// 'fsr', 'anime4k'). Owns the WebGPU device/canvas context and the parts
// that are identical across those modes; only the compute passes in between
// differ, via `createUpscaleAlgorithm`.
export function createStandardDriver(mode: Exclude<UpscaleMode, 'websr'>, { video, canvas }: CreateUpscaleDriverParams): UpscaleDriver {
  let pipeline: StandardPipeline | null = null;

  return {
    async setup() {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('No WebGPU adapter available');
      const device = await adapter.requestDevice();

      const srcWidth = video.videoWidth || 1280;
      const srcHeight = video.videoHeight || 720;
      const { width: dstWidth, height: dstHeight } = computeUpscaleDstDimensions(mode, srcWidth, srcHeight);

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

      const algorithm = createUpscaleAlgorithm(mode, { device, sourceTexture, srcWidth, srcHeight, dstWidth, dstHeight });

      const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
      const blitModule = device.createShaderModule({ code: BLIT_SHADER });
      const blitPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: blitModule, entryPoint: 'vs_main' },
        fragment: { module: blitModule, entryPoint: 'fs_main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });
      const blitBindGroup = device.createBindGroup({
        layout: blitPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: algorithm.finalTexture.createView() },
        ],
      });

      pipeline = { device, context, sourceTexture, algorithm, blitPipeline, blitBindGroup, srcWidth, srcHeight };
    },

    async renderFrame() {
      if (!pipeline) return;
      const { device, context, sourceTexture, algorithm, blitPipeline, blitBindGroup, srcWidth, srcHeight } = pipeline;

      device.queue.copyExternalImageToTexture(
        { source: video },
        { texture: sourceTexture },
        [srcWidth, srcHeight]
      );

      const encoder = device.createCommandEncoder();
      algorithm.encodePasses(encoder);

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
    },

    destroy() {
      if (pipeline) {
        pipeline.sourceTexture.destroy();
        pipeline.algorithm.destroy();
        pipeline.device.destroy();
      }
      pipeline = null;
    },
  };
}

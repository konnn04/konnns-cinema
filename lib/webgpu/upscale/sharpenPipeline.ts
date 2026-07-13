import { SHARPEN_SHADER } from './sharpenShader';
import type { CreateUpscaleAlgorithmParams, UpscaleAlgorithm } from './types';

// Single-pass Laplacian mode has no bicubic upscale softening it back down,
// so it needs a lighter touch than RCAS's SHARPNESS to avoid over-sharpening.
const UNSHARP_STRENGTH = 0.35;

export function createSharpenAlgorithm({ device, sourceTexture, dstWidth, dstHeight }: CreateUpscaleAlgorithmParams): UpscaleAlgorithm {
  const outputTexture = device.createTexture({
    size: [dstWidth, dstHeight],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
  });

  const paramsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([dstWidth, dstHeight, UNSHARP_STRENGTH, 0]));

  const shaderModule = device.createShaderModule({ code: SHARPEN_SHADER });
  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: shaderModule, entryPoint: 'main' },
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sourceTexture.createView() },
      { binding: 1, resource: outputTexture.createView() },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ],
  });

  return {
    finalTexture: outputTexture,
    encodePasses(encoder) {
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(dstWidth / 8), Math.ceil(dstHeight / 8));
      pass.end();
    },
    destroy() {
      outputTexture.destroy();
    },
  };
}

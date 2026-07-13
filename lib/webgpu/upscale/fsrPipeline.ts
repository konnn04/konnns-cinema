import { EASU_SHADER, RCAS_SHADER } from './fsrShader';
import type { CreateUpscaleAlgorithmParams, UpscaleAlgorithm } from './types';

// EASU is a proper Catmull-Rom bicubic (already visibly sharper than
// bilinear on its own), so RCAS only needs to add a light final touch --
// 0.55 was too aggressive and amplified compression noise into visible
// speckling, especially on flat anime color fields. RCAS also clamps to the
// local min/max (anti-ringing) so this has a smaller failure radius than
// before regardless.
const SHARPNESS = 0.25;

export function createFsrAlgorithm({ device, sourceTexture, srcWidth, srcHeight, dstWidth, dstHeight }: CreateUpscaleAlgorithmParams): UpscaleAlgorithm {
  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });

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

  const easuPipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: easuModule, entryPoint: 'main' },
  });
  const rcasPipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: rcasModule, entryPoint: 'main' },
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

  return {
    finalTexture: rcasOutputTexture,
    encodePasses(encoder) {
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
    },
    destroy() {
      easuOutputTexture.destroy();
      rcasOutputTexture.destroy();
    },
  };
}

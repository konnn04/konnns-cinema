// It's BETA, not PRODUCTION, not suitable for reference purposes

import { MOTION_ESTIMATION_SHADER, INTERPOLATE_SHADER } from './motionShaders';
import type { CreateFrameInterpolationAlgorithmParams, FrameInterpolationAlgorithm } from './types';

const BLOCK_SIZE = 16;
const SEARCH_RADIUS = 8;

export function createMotionAlgorithm({ device, prevTexture, currTexture, width, height }: CreateFrameInterpolationAlgorithmParams): FrameInterpolationAlgorithm {
  const blocksX = Math.ceil(width / BLOCK_SIZE);
  const blocksY = Math.ceil(height / BLOCK_SIZE);

  const motionTexture = device.createTexture({
    size: [blocksX, blocksY],
    // rgba32float: .xy motion vector, .z average match error (confidence signal)
    format: 'rgba32float',
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

  const motionPipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: motionModule, entryPoint: 'main' },
  });
  const interpPipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: interpModule, entryPoint: 'main' },
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

  return {
    interpTexture,
    encodePasses(encoder) {
      const motionPass = encoder.beginComputePass();
      motionPass.setPipeline(motionPipeline);
      motionPass.setBindGroup(0, motionBindGroup);
      motionPass.dispatchWorkgroups(Math.ceil(blocksX / 8), Math.ceil(blocksY / 8));
      motionPass.end();

      const interpPass = encoder.beginComputePass();
      interpPass.setPipeline(interpPipeline);
      interpPass.setBindGroup(0, interpBindGroup);
      interpPass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
      interpPass.end();
    },
    destroy() {
      motionTexture.destroy();
      interpTexture.destroy();
    },
  };
}

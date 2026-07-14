// It's BETA, not PRODUCTION, not suitable for reference purposes

import { BLEND_SHADER } from './blendShader';
import type { CreateFrameInterpolationAlgorithmParams, FrameInterpolationAlgorithm } from './types';

export function createBlendAlgorithm({ device, prevTexture, currTexture, width, height }: CreateFrameInterpolationAlgorithmParams): FrameInterpolationAlgorithm {
  const interpTexture = device.createTexture({
    size: [width, height],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
  });

  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  const shaderModule = device.createShaderModule({ code: BLEND_SHADER });
  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: shaderModule, entryPoint: 'main' },
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: prevTexture.createView() },
      { binding: 1, resource: currTexture.createView() },
      { binding: 2, resource: interpTexture.createView() },
      { binding: 3, resource: sampler },
    ],
  });

  return {
    interpTexture,
    encodePasses(encoder) {
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
      pass.end();
    },
    destroy() {
      interpTexture.destroy();
    },
  };
}

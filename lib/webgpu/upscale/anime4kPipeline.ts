import { ModeA } from 'anime4k-webgpu';
import type { CreateUpscaleAlgorithmParams, UpscaleAlgorithm } from './types';

// Real Anime4K (https://github.com/bloc97/Anime4K) ported to native WebGPU
// compute shaders by the anime4k-webgpu package -- CNN-based denoise +
// deblur + upscale tuned for anime line art, not a hand-rolled approximation
// like the 'fsr' mode. Mode A (the package's general-purpose preset: Restore
// CNN -> Upscale CNN) is the heaviest of the three upscale modes, per the
// package's own benchmarks (~3ms/frame at 720p on a discrete GPU) -- fine on
// dedicated graphics, but the one most likely to contend with hardware video
// decode on integrated GPUs.
export function createAnime4kAlgorithm({ device, sourceTexture, srcWidth, srcHeight, dstWidth, dstHeight }: CreateUpscaleAlgorithmParams): UpscaleAlgorithm {
  const pipeline = new ModeA({
    device,
    inputTexture: sourceTexture,
    nativeDimensions: { width: srcWidth, height: srcHeight },
    targetDimensions: { width: dstWidth, height: dstHeight },
  });

  return {
    finalTexture: pipeline.getOutputTexture(),
    encodePasses(encoder) {
      pipeline.pass(encoder);
    },
    destroy() {
      // No explicit teardown in the Anime4KPipeline interface -- its
      // textures/pipelines are owned by `device` and get invalidated when
      // the hook calls device.destroy() during teardown.
    },
  };
}

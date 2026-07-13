export type FrameInterpolationMode = 'blend' | 'motion';

// One GPU-side interpolation algorithm, decoupled from video ingestion and
// the display-refresh-rate presentation loop (both stay in
// useFrameInterpolation.ts and are shared across modes). A mode only needs
// to turn prevTexture+currTexture into an interpTexture.
export interface FrameInterpolationAlgorithm {
  interpTexture: GPUTexture;
  encodePasses(encoder: GPUCommandEncoder): void;
  destroy(): void;
}

export interface CreateFrameInterpolationAlgorithmParams {
  device: GPUDevice;
  prevTexture: GPUTexture;
  currTexture: GPUTexture;
  width: number;
  height: number;
}

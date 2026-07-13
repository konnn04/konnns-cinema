export type UpscaleMode = 'sharpen' | 'fsr' | 'anime4k' | 'websr';

// One GPU-side upscale/sharpen algorithm, decoupled from video ingestion and
// canvas presentation (both stay in standardDriver.ts and are shared across
// the modes that use this shape). A mode only needs to turn `sourceTexture`
// into `finalTexture`.
export interface UpscaleAlgorithm {
  finalTexture: GPUTexture;
  encodePasses(encoder: GPUCommandEncoder): void;
  destroy(): void;
}

export interface CreateUpscaleAlgorithmParams {
  device: GPUDevice;
  sourceTexture: GPUTexture;
  srcWidth: number;
  srcHeight: number;
  dstWidth: number;
  dstHeight: number;
}

// A driver owns the whole per-frame lifecycle for one mode: video ingestion,
// GPU work, and getting pixels onto `canvas`. Most modes ('sharpen', 'fsr',
// 'anime4k') share the same shape (copy video frame into a texture, run
// compute passes, blit to canvas) via standardDriver.ts + UpscaleAlgorithm.
// A mode that can't fit that shape (e.g. 'websr', which owns its own canvas
// presentation internally) just implements UpscaleDriver directly instead --
// the hook only ever talks to this interface, so it doesn't need to know
// the difference.
export interface UpscaleDriver {
  setup(): Promise<void>;
  renderFrame(): Promise<void>;
  destroy(): void;
}

export interface CreateUpscaleDriverParams {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
}

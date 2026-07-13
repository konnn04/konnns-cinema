import type { UpscaleMode } from './types';

const MAX_DST_WIDTH = 1920;
const UPSCALE_FACTOR = 1.5;

// 'sharpen' does no resolution change (native size, single cheap pass).
// 'fsr' and 'anime4k' both actually raise resolution, so they share the
// same target-size math.
export function computeUpscaleDstDimensions(mode: UpscaleMode, srcWidth: number, srcHeight: number) {
  if (mode === 'sharpen') {
    return { width: srcWidth, height: srcHeight };
  }
  const width = Math.min(Math.round(srcWidth * UPSCALE_FACTOR), MAX_DST_WIDTH);
  const height = Math.round(width * (srcHeight / srcWidth));
  return { width, height };
}

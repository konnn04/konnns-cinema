import { createSharpenAlgorithm } from './sharpenPipeline';
import { createFsrAlgorithm } from './fsrPipeline';
import { createAnime4kAlgorithm } from './anime4kPipeline';
import type { CreateUpscaleAlgorithmParams, UpscaleAlgorithm, UpscaleMode } from './types';

// Factory for the "standard" GPU-pass modes only ('websr' doesn't fit this
// shape -- see standardDriver.ts / websrDriver.ts for why).
export function createUpscaleAlgorithm(mode: Exclude<UpscaleMode, 'websr'>, params: CreateUpscaleAlgorithmParams): UpscaleAlgorithm {
  switch (mode) {
    case 'fsr':
      return createFsrAlgorithm(params);
    case 'anime4k':
      return createAnime4kAlgorithm(params);
    case 'sharpen':
    default:
      return createSharpenAlgorithm(params);
  }
}

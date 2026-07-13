import { createBlendAlgorithm } from './blendPipeline';
import { createMotionAlgorithm } from './motionPipeline';
import type { CreateFrameInterpolationAlgorithmParams, FrameInterpolationAlgorithm, FrameInterpolationMode } from './types';

export type { FrameInterpolationMode, FrameInterpolationAlgorithm, CreateFrameInterpolationAlgorithmParams } from './types';
export { BLIT_SHADER } from './blitShader';

export function createFrameInterpolationAlgorithm(mode: FrameInterpolationMode, params: CreateFrameInterpolationAlgorithmParams): FrameInterpolationAlgorithm {
  return mode === 'motion' ? createMotionAlgorithm(params) : createBlendAlgorithm(params);
}

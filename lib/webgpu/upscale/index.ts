import { createStandardDriver } from './standardDriver';
import { createWebSrDriver } from './websrDriver';
import type { CreateUpscaleDriverParams, UpscaleDriver, UpscaleMode } from './types';

export type { UpscaleMode, UpscaleAlgorithm, CreateUpscaleAlgorithmParams, UpscaleDriver, CreateUpscaleDriverParams } from './types';
export { computeUpscaleDstDimensions } from './dimensions';

export function createUpscaleDriver(mode: UpscaleMode, params: CreateUpscaleDriverParams): UpscaleDriver {
  if (mode === 'websr') {
    return createWebSrDriver(params);
  }
  return createStandardDriver(mode, params);
}

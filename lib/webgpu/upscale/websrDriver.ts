import WebSR from '@websr/websr';
import weights from '@websr/websr/weights/anime4k/cnn-2x-s-an.json';
import type { CreateUpscaleDriverParams, UpscaleDriver } from './types';

// @websr/websr (https://github.com/sb2702/websr) is a different, newer port
// of the same Anime4K CNN family as the 'anime4k' mode, shipping its own
// bundled pretrained weights (using the small "cnn-2x-s" animation network
// here -- the lightest of the three sizes it offers). The author's own
// README flags it as pre-1.0 and "shouldn't be used yet in production,
// expect API changes between versions and bugs" -- kept as an explicit
// opt-in experiment, not a replacement for 'anime4k'.
//
// Unlike the other 3 modes, WebSR owns video ingestion, its own WebGPU
// device, and canvas presentation internally -- `render(video)` does
// everything in one call and even resizes the canvas itself on first frame.
// It can't share standardDriver's copy-into-texture + blit pipeline, so it
// gets its own driver instead; the hook doesn't need to know the difference.
export function createWebSrDriver({ video, canvas }: CreateUpscaleDriverParams): UpscaleDriver {
  let websr: WebSR | null = null;

  return {
    async setup() {
      const gpu = await WebSR.initWebGPU();
      if (!gpu) throw new Error('WebSR: this browser/device does not support WebGPU');
      websr = new WebSR({
        network_name: 'anime4k/cnn-2x-s',
        weights,
        gpu,
        canvas,
      });
    },

    async renderFrame() {
      if (!websr) return;
      await websr.render(video);
    },

    destroy() {
      websr?.destroy();
      websr = null;
    },
  };
}

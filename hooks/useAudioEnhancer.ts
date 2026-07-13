'use client';

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';

export type AudioPreset = 'none' | 'dialog' | 'bass' | 'treble' | 'loudness' | 'surround';

interface AudioNodes {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  dialogFilter: BiquadFilterNode;
  bassFilter: BiquadFilterNode;
  trebleFilter: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  dryGain: GainNode;
  wetGain: GainNode;
  convolver: ConvolverNode;
  outputGain: GainNode;
}

// Synthesizes a short, decaying stereo noise impulse response at runtime --
// there's no bundled audio asset, so "virtual surround" is a lightweight
// convolution reverb rather than true HRTF spatialization.
function buildSurroundImpulse(ctx: AudioContext): AudioBuffer {
  const duration = 0.6;
  const length = Math.floor(ctx.sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.5);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  return impulse;
}

const SMOOTH_TIME = 0.06;

function applyPreset(nodes: AudioNodes, preset: AudioPreset) {
  const { ctx, dialogFilter, bassFilter, trebleFilter, compressor, dryGain, wetGain } = nodes;
  const now = ctx.currentTime;

  const set = (param: AudioParam, value: number) => param.setTargetAtTime(value, now, SMOOTH_TIME);

  // Reset to a neutral (effectively passthrough) baseline, then layer the active preset on top.
  set(dialogFilter.gain, 0);
  set(bassFilter.gain, 0);
  set(trebleFilter.gain, 0);
  set(compressor.threshold, 0);
  set(compressor.ratio, 1);
  set(dryGain.gain, 1);
  set(wetGain.gain, 0);

  switch (preset) {
    case 'dialog':
      set(dialogFilter.gain, 6);
      break;
    case 'bass':
      set(bassFilter.gain, 7);
      break;
    case 'treble':
      set(trebleFilter.gain, 5);
      break;
    case 'loudness':
      set(compressor.threshold, -28);
      set(compressor.ratio, 6);
      break;
    case 'surround':
      set(dryGain.gain, 0.75);
      set(wetGain.gain, 0.4);
      break;
    default:
      break;
  }
}

interface UseAudioEnhancerOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  preset: AudioPreset;
}

// Controlled by the `preset` prop -- the caller (typically driven by a
// persisted preference) owns the desired state; this hook just makes it so.
export function useAudioEnhancer({ videoRef, preset }: UseAudioEnhancerOptions) {
  const [error, setError] = useState<string | null>(null);
  const nodesRef = useRef<AudioNodes | null>(null);

  const isSupported = typeof window !== 'undefined' && !!(window.AudioContext || (window as any).webkitAudioContext);

  const ensureGraph = useCallback((): AudioNodes | null => {
    if (nodesRef.current) return nodesRef.current;
    const video = videoRef.current;
    if (!video || !isSupported) return null;

    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioContextCtor();
      // createMediaElementSource may only ever be called once per <video> element.
      const source = ctx.createMediaElementSource(video);

      const dialogFilter = ctx.createBiquadFilter();
      dialogFilter.type = 'peaking';
      dialogFilter.frequency.value = 2500;
      dialogFilter.Q.value = 1.4;

      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 150;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 6000;

      const compressor = ctx.createDynamicsCompressor();
      compressor.knee.value = 12;
      compressor.attack.value = 0.01;
      compressor.release.value = 0.25;

      const convolver = ctx.createConvolver();
      convolver.buffer = buildSurroundImpulse(ctx);

      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      wetGain.gain.value = 0;
      const outputGain = ctx.createGain();

      source.connect(dialogFilter);
      dialogFilter.connect(bassFilter);
      bassFilter.connect(trebleFilter);
      trebleFilter.connect(compressor);

      compressor.connect(dryGain);
      compressor.connect(convolver);
      convolver.connect(wetGain);

      dryGain.connect(outputGain);
      wetGain.connect(outputGain);
      outputGain.connect(ctx.destination);

      const nodes: AudioNodes = {
        ctx, source, dialogFilter, bassFilter, trebleFilter, compressor, dryGain, wetGain, convolver, outputGain,
      };
      nodesRef.current = nodes;
      return nodes;
    } catch (err) {
      console.error('Failed to initialize audio enhancer graph:', err);
      setError('Audio enhancement is unavailable for this stream.');
      return null;
    }
  }, [videoRef, isSupported]);

  useEffect(() => {
    if (preset === 'none' && !nodesRef.current) {
      // Don't spin up an AudioContext just to sit at the neutral preset --
      // wait for the first real activation.
      return;
    }
    // ensureGraph()/applyPreset() are synchronous and only ever set `error`
    // on an actual failure, which is exactly what an effect is for here:
    // reacting to the `preset` prop by synchronizing the Web Audio graph.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const nodes = ensureGraph();
    if (!nodes) return;
    if (nodes.ctx.state === 'suspended') {
      nodes.ctx.resume().catch(() => {});
    }
    applyPreset(nodes, preset);
  }, [preset, ensureGraph]);

  return { isSupported, error };
}

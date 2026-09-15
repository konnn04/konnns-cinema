'use client';

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import type { AudioPreset, AudioEqSettings } from '@/lib/audio/types';
import {
  EQ_FREQUENCIES,
  EQ_LABELS,
  AUDIO_PRESET_CONFIGS,
  DEFAULT_AUDIO_EQ_SETTINGS,
} from '@/lib/audio/constants';

export type { AudioPreset, AudioEqSettings };
export { EQ_FREQUENCIES, EQ_LABELS, AUDIO_PRESET_CONFIGS, DEFAULT_AUDIO_EQ_SETTINGS };

interface AudioNodes {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  preampGain: GainNode;
  eqFilters: BiquadFilterNode[];
  bassBoostFilter: BiquadFilterNode;
  vocalBoostFilter: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  dryGain: GainNode;
  wetGain: GainNode;
  convolver: ConvolverNode;
  outputGain: GainNode;
}

function buildSurroundImpulse(ctx: AudioContext): AudioBuffer {
  const duration = 0.5;
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

const SMOOTH_TIME = 0.05;

function applySettings(nodes: AudioNodes, settings: AudioEqSettings) {
  const { ctx, preampGain, eqFilters, bassBoostFilter, vocalBoostFilter, compressor, dryGain, wetGain } = nodes;
  const now = ctx.currentTime;
  const set = (param: AudioParam, value: number) => param.setTargetAtTime(value, now, SMOOTH_TIME);

  // Preamp
  const preampLinear = Math.pow(10, (settings.preamp || 0) / 20);
  set(preampGain.gain, preampLinear);

  // 6 Graphic EQ bands
  settings.bands.forEach((gainVal, idx) => {
    if (eqFilters[idx]) {
      set(eqFilters[idx].gain, gainVal);
    }
  });

  // Dedicated Super Bass Boost (lowshelf at 80Hz)
  set(bassBoostFilter.gain, settings.bassBoost || 0);

  // Dedicated Vocal Clarity Boost (peaking at 2500Hz)
  set(vocalBoostFilter.gain, settings.vocalBoost || 0);

  // Compressor limiter settings to prevent clipping especially with heavy bass boost
  if (settings.preset === 'night') {
    set(compressor.threshold, -32);
    set(compressor.ratio, 8);
  } else if (settings.bassBoost > 6) {
    set(compressor.threshold, -18);
    set(compressor.ratio, 4);
  } else {
    set(compressor.threshold, -8);
    set(compressor.ratio, 2);
  }

  // Virtual surround wet/dry
  const surroundAmount = Math.max(0, Math.min(1, settings.surround || 0));
  set(dryGain.gain, Math.max(0.2, 1 - surroundAmount * 0.4));
  set(wetGain.gain, surroundAmount * 0.45);
}

interface UseAudioEnhancerOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  preset?: AudioPreset;
  settings?: AudioEqSettings;
}

export function useAudioEnhancer({ videoRef, preset, settings }: UseAudioEnhancerOptions) {
  const [error, setError] = useState<string | null>(null);
  const nodesRef = useRef<AudioNodes | null>(null);
  const activeSettingsRef = useRef<AudioEqSettings>(DEFAULT_AUDIO_EQ_SETTINGS);

  const isSupported = typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);

  // Update activeSettingsRef based on props
  useEffect(() => {
    if (settings) {
      activeSettingsRef.current = settings;
    } else if (preset && preset !== 'custom') {
      const config = AUDIO_PRESET_CONFIGS[preset] || AUDIO_PRESET_CONFIGS.none;
      activeSettingsRef.current = {
        preset,
        bands: [...config.bands] as [number, number, number, number, number, number],
        bassBoost: config.bassBoost,
        vocalBoost: config.vocalBoost,
        surround: config.surround,
        preamp: config.preamp,
      };
    }
  }, [preset, settings]);

  const ensureGraph = useCallback((): AudioNodes | null => {
    if (nodesRef.current) return nodesRef.current;
    const video = videoRef.current;
    if (!video || !isSupported) return null;

    try {
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx: AudioContext = new AudioContextCtor();
      const source = ctx.createMediaElementSource(video);

      const preampGain = ctx.createGain();

      // 6 Equalizer filters
      const eqFilters: BiquadFilterNode[] = [
        ctx.createBiquadFilter(), // 60Hz lowshelf
        ctx.createBiquadFilter(), // 150Hz peaking
        ctx.createBiquadFilter(), // 400Hz peaking
        ctx.createBiquadFilter(), // 1000Hz peaking
        ctx.createBiquadFilter(), // 3500Hz peaking
        ctx.createBiquadFilter(), // 10000Hz highshelf
      ];

      eqFilters[0].type = 'lowshelf';
      eqFilters[0].frequency.value = 60;

      eqFilters[1].type = 'peaking';
      eqFilters[1].frequency.value = 150;
      eqFilters[1].Q.value = 1.0;

      eqFilters[2].type = 'peaking';
      eqFilters[2].frequency.value = 400;
      eqFilters[2].Q.value = 1.0;

      eqFilters[3].type = 'peaking';
      eqFilters[3].frequency.value = 1000;
      eqFilters[3].Q.value = 1.0;

      eqFilters[4].type = 'peaking';
      eqFilters[4].frequency.value = 3500;
      eqFilters[4].Q.value = 1.0;

      eqFilters[5].type = 'highshelf';
      eqFilters[5].frequency.value = 10000;

      // Dedicated super bass boost (lowshelf at 80Hz)
      const bassBoostFilter = ctx.createBiquadFilter();
      bassBoostFilter.type = 'lowshelf';
      bassBoostFilter.frequency.value = 80;

      // Dedicated vocal boost filter
      const vocalBoostFilter = ctx.createBiquadFilter();
      vocalBoostFilter.type = 'peaking';
      vocalBoostFilter.frequency.value = 2500;
      vocalBoostFilter.Q.value = 1.4;

      // Dynamics compressor (limiter / distortion protection)
      const compressor = ctx.createDynamicsCompressor();
      compressor.knee.value = 12;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.2;

      // Convolver for virtual surround
      const convolver = ctx.createConvolver();
      convolver.buffer = buildSurroundImpulse(ctx);

      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      wetGain.gain.value = 0;
      const outputGain = ctx.createGain();

      // Connect: source -> preamp -> eq[0]...eq[5] -> bassBoost -> vocalBoost -> compressor
      source.connect(preampGain);
      let prevNode: AudioNode = preampGain;
      for (const eq of eqFilters) {
        prevNode.connect(eq);
        prevNode = eq;
      }
      prevNode.connect(bassBoostFilter);
      bassBoostFilter.connect(vocalBoostFilter);
      vocalBoostFilter.connect(compressor);

      // Branch: compressor -> dryGain -> outputGain
      //         compressor -> convolver -> wetGain -> outputGain
      compressor.connect(dryGain);
      compressor.connect(convolver);
      convolver.connect(wetGain);

      dryGain.connect(outputGain);
      wetGain.connect(outputGain);
      outputGain.connect(ctx.destination);

      const nodes: AudioNodes = {
        ctx,
        source,
        preampGain,
        eqFilters,
        bassBoostFilter,
        vocalBoostFilter,
        compressor,
        dryGain,
        wetGain,
        convolver,
        outputGain,
      };

      nodesRef.current = nodes;
      return nodes;
    } catch (err) {
      console.error('Failed to initialize audio enhancer graph:', err);
      setError('Audio enhancement is unavailable for this stream.');
      return null;
    }
  }, [videoRef, isSupported]);

  const syncSettings = useCallback(() => {
    const isPassthrough =
      activeSettingsRef.current.preset === 'none' &&
      activeSettingsRef.current.bassBoost === 0 &&
      activeSettingsRef.current.vocalBoost === 0 &&
      activeSettingsRef.current.surround === 0 &&
      activeSettingsRef.current.preamp === 0 &&
      activeSettingsRef.current.bands.every((b) => b === 0);

    if (isPassthrough && !nodesRef.current) return;
    const nodes = ensureGraph();
    if (!nodes) return;
    if (nodes.ctx.state === 'suspended') {
      nodes.ctx.resume().catch(() => {});
    }
    applySettings(nodes, activeSettingsRef.current);
  }, [ensureGraph]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      syncSettings();
      return;
    }
    video.addEventListener('playing', syncSettings);
    return () => video.removeEventListener('playing', syncSettings);
  }, [videoRef, syncSettings]);

  useEffect(() => {
    syncSettings();
  }, [preset, settings, syncSettings]);

  return { isSupported, error, syncSettings };
}

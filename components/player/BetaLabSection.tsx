'use client';

import { FlaskConical } from 'lucide-react';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import type { AudioPreset } from '@/hooks/useAudioEnhancer';
import type { UpscaleMode } from '@/lib/webgpu/upscale';
import type { FrameInterpolationMode } from '@/lib/webgpu/frameInterpolation';

interface BetaLabSectionProps {
  webgpuSupported: boolean;
  fsrError: string | null;
  frameInterpolationError: string | null;
  audioError: string | null;
}

const AUDIO_PRESETS: { value: AudioPreset; label: string }[] = [
  { value: 'none', label: 'Off' },
  { value: 'dialog', label: 'Dialog Boost' },
  { value: 'bass', label: 'Bass Boost' },
  { value: 'treble', label: 'Treble Boost' },
  { value: 'loudness', label: 'Loudness Norm.' },
  { value: 'surround', label: 'Virtual Surround' },
];

// Experimental player enhancements: WebGPU upscaling, WebGPU frame
// interpolation, and Web Audio based audio presets. All BETA -- disabled by
// default, opt-in per browser session state persisted in preferences.
export default function BetaLabSection({ webgpuSupported, fsrError, frameInterpolationError, audioError }: BetaLabSectionProps) {
  const betaAudioPreset = usePreferencesStore((s) => s.betaAudioPreset);
  const setBetaAudioPreset = usePreferencesStore((s) => s.setBetaAudioPreset);
  const betaFsrUpscale = usePreferencesStore((s) => s.betaFsrUpscale);
  const setBetaFsrUpscale = usePreferencesStore((s) => s.setBetaFsrUpscale);
  const betaFsrUpscaleMode = usePreferencesStore((s) => s.betaFsrUpscaleMode);
  const setBetaFsrUpscaleMode = usePreferencesStore((s) => s.setBetaFsrUpscaleMode);
  const betaFrameInterpolation = usePreferencesStore((s) => s.betaFrameInterpolation);
  const setBetaFrameInterpolation = usePreferencesStore((s) => s.setBetaFrameInterpolation);
  const betaFrameInterpolationMode = usePreferencesStore((s) => s.betaFrameInterpolationMode);
  const setBetaFrameInterpolationMode = usePreferencesStore((s) => s.setBetaFrameInterpolationMode);

  return (
    <div className="space-y-3 pt-1 border-t border-zinc-900">
      <span className="text-[10px] font-sans font-bold text-zinc-400 flex items-center gap-1.5">
        <FlaskConical size={11} className="text-[#E2B646]" />
        <span>BETA LAB</span>
      </span>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Audio Enhance</span>
          <span className="text-[7px] font-mono px-1 border border-[#E2B646]/40 text-[#E2B646]">BETA</span>
        </div>
        <select
          value={betaAudioPreset}
          onChange={(e) => setBetaAudioPreset(e.target.value as AudioPreset)}
          className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 px-2 py-1.5 focus:outline-none focus:border-[#E2B646] cursor-pointer"
        >
          {AUDIO_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {audioError && <p className="text-[8px] text-red-500 leading-tight">{audioError}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1">
            Upscale (FSR)
            <span className="text-[7px] font-mono px-1 border border-[#E2B646]/40 text-[#E2B646]">BETA</span>
          </span>
        </div>
        <select
          value={betaFsrUpscale ? betaFsrUpscaleMode : 'off'}
          disabled={!webgpuSupported}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'off') {
              setBetaFsrUpscale(false);
            } else {
              setBetaFsrUpscaleMode(v as UpscaleMode);
              setBetaFsrUpscale(true);
            }
          }}
          className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 px-2 py-1.5 focus:outline-none focus:border-[#E2B646] cursor-pointer disabled:cursor-not-allowed disabled:text-zinc-700"
        >
          <option value="off">{webgpuSupported ? 'Off' : 'WebGPU not supported'}</option>
          <option value="sharpen">harpen (light)</option>
          <option value="fsr">Upscale + Sharpen (heavy)</option>
          <option value="anime4k">Anime4K (heavy, best for anime)</option>
          <option value="websr">WebSR (experimental)</option>
        </select>
        {betaFsrUpscale && (
          <p className="text-[8px] text-zinc-600 leading-tight">
            {betaFsrUpscaleMode === 'sharpen' && 'Edge-contrast sharpen only, native resolution -- cheap, minimal stutter risk.'}
            {betaFsrUpscaleMode === 'fsr' && 'Bicubic upscale + sharpen, GPU-heavier -- most visible in Fullscreen/Theater Mode, can contend with video decode on weaker GPUs.'}
            {betaFsrUpscaleMode === 'anime4k' && 'Real Anime4K CNN pipeline (anime4k-webgpu) -- best quality on anime line art, but heavy; most likely to stutter on integrated GPUs.'}
            {betaFsrUpscaleMode === 'websr' && 'Different AI upscale library (@websr/websr), also Anime4K-based. Pre-1.0 per its own author -- expect bugs, may change or break between updates.'}
          </p>
        )}
        {fsrError && <p className="text-[8px] text-red-500 leading-tight">{fsrError}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1">
            Frame Interpolation
            <span className="text-[7px] font-mono px-1 border border-[#E2B646]/40 text-[#E2B646]">BETA</span>
          </span>
        </div>
        <select
          value={betaFrameInterpolation ? betaFrameInterpolationMode : 'off'}
          disabled={!webgpuSupported}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'off') {
              setBetaFrameInterpolation(false);
            } else {
              setBetaFrameInterpolationMode(v as FrameInterpolationMode);
              setBetaFrameInterpolation(true);
            }
          }}
          className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 px-2 py-1.5 focus:outline-none focus:border-[#E2B646] cursor-pointer disabled:cursor-not-allowed disabled:text-zinc-700"
        >
          <option value="off">{webgpuSupported ? 'Off' : 'WebGPU not supported'}</option>
          <option value="blend">Blend (light)</option>
          <option value="motion">Motion (heavy)</option>
        </select>
        {betaFrameInterpolation && (
          <p className="text-[8px] text-zinc-600 leading-tight">
            {betaFrameInterpolationMode === 'blend'
              ? 'Cross-fade only, no motion analysis -- cheap, minimal stutter risk, more ghosting on fast motion.'
              : 'Motion-compensated, GPU-heavier -- can contend with video decode and cause stutter/stalls on weaker GPUs.'}
          </p>
        )}
        {frameInterpolationError && <p className="text-[8px] text-red-500 leading-tight">{frameInterpolationError}</p>}
      </div>
    </div>
  );
}

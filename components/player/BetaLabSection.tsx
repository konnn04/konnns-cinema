'use client';

import { FlaskConical } from 'lucide-react';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import type { AudioPreset } from '@/hooks/useAudioEnhancer';

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

function BetaToggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[10px] font-sans font-bold ${disabled ? 'text-zinc-700' : 'text-zinc-400'}`}>{label}</span>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          disabled ? 'bg-zinc-900 cursor-not-allowed' : 'cursor-pointer'
        } ${checked ? 'bg-[#E2B646]' : 'bg-zinc-800'}`}
      >
        <span
          className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ${
            checked ? 'translate-x-4.5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// Experimental player enhancements: WebGPU upscaling, WebGPU frame
// interpolation, and Web Audio based audio presets. All BETA -- disabled by
// default, opt-in per browser session state persisted in preferences.
export default function BetaLabSection({ webgpuSupported, fsrError, frameInterpolationError, audioError }: BetaLabSectionProps) {
  const betaAudioPreset = usePreferencesStore((s) => s.betaAudioPreset);
  const setBetaAudioPreset = usePreferencesStore((s) => s.setBetaAudioPreset);
  const betaFsrUpscale = usePreferencesStore((s) => s.betaFsrUpscale);
  const setBetaFsrUpscale = usePreferencesStore((s) => s.setBetaFsrUpscale);
  const betaFrameInterpolation = usePreferencesStore((s) => s.betaFrameInterpolation);
  const setBetaFrameInterpolation = usePreferencesStore((s) => s.setBetaFrameInterpolation);

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
        <BetaToggle
          label={webgpuSupported ? 'WebGPU upscale + sharpen' : 'WebGPU not supported'}
          checked={betaFsrUpscale}
          disabled={!webgpuSupported}
          onChange={() => setBetaFsrUpscale(!betaFsrUpscale)}
        />
        {fsrError && <p className="text-[8px] text-red-500 leading-tight">{fsrError}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1">
            Frame Interpolation
            <span className="text-[7px] font-mono px-1 border border-[#E2B646]/40 text-[#E2B646]">BETA</span>
          </span>
        </div>
        <BetaToggle
          label={webgpuSupported ? 'Experimental, may ghost/stutter' : 'WebGPU not supported'}
          checked={betaFrameInterpolation}
          disabled={!webgpuSupported}
          onChange={() => setBetaFrameInterpolation(!betaFrameInterpolation)}
        />
        {frameInterpolationError && <p className="text-[8px] text-red-500 leading-tight">{frameInterpolationError}</p>}
      </div>
    </div>
  );
}

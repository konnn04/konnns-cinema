'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings } from 'lucide-react';
import BetaLabSection from './BetaLabSection';

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

interface PlayerSettingsPopoverProps {
  isSharpenEnabled: boolean;
  onToggleSharpen: () => void;
  playbackRate: number;
  onSetRate: (rate: number) => void;
  webgpuSupported: boolean;
  fsrError: string | null;
  frameInterpolationError: string | null;
  audioError: string | null;
}

export default function PlayerSettingsPopover({
  isSharpenEnabled, onToggleSharpen, playbackRate, onSetRate,
  webgpuSupported, fsrError, frameInterpolationError, audioError,
}: PlayerSettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 hover:bg-zinc-800/50 rounded-none text-zinc-300 hover:text-white transition-colors cursor-pointer ${open ? 'text-[#E2B646]' : ''}`}
        title="Playback Settings"
      >
        <Settings size={16} className={open ? 'animate-spin' : ''} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 w-64 max-h-[80vh] overflow-y-auto no-scrollbar bg-zinc-950 border border-zinc-900 rounded-none p-3.5 shadow-2xl z-30 space-y-4 text-left"
          >
            <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 border-b border-zinc-900 pb-2 flex justify-between items-center">
              <span>PLAYBACK SETTINGS</span>
              <Settings size={10} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans font-bold text-zinc-400">IMAGE ENHANCE</span>
                <button
                  onClick={onToggleSharpen}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    isSharpenEnabled ? 'bg-[#E2B646]' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ${
                      isSharpenEnabled ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[8px] text-zinc-550 leading-tight">
                Contrast booster & texture sharpen filter overlay.
              </p>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-zinc-900">
              <span className="text-[10px] font-sans font-bold text-zinc-400 block">PLAYBACK SPEED</span>
              <div className="grid grid-cols-5 gap-1">
                {SPEEDS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => onSetRate(rate)}
                    className={`py-1 text-[10px] font-mono border rounded-none transition-all cursor-pointer ${
                      rate === playbackRate
                        ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646] font-bold'
                        : 'border-zinc-900 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <BetaLabSection
              webgpuSupported={webgpuSupported}
              fsrError={fsrError}
              frameInterpolationError={frameInterpolationError}
              audioError={audioError}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export function SkipFeedbackOverlay({ direction }: { direction: 'forward' | 'backward' | null }) {
  return (
    <AnimatePresence>
      {direction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs w-16 h-16 rounded-full border border-white/10 ${
            direction === 'backward' ? 'left-1/4' : 'right-1/4'
          }`}
        >
          <span className="text-zinc-350 text-xs font-mono font-black">
            {direction === 'backward' ? '-10s' : '+10s'}
          </span>
          <span className="text-[10px] font-serif font-black italic tracking-wider text-[#E2B646]">
            {direction === 'backward' ? '◀◀' : '▶▶'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BufferingOverlay() {
  const { t } = useLanguage();
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs">
      <div className="w-12 h-12 border-t-2 border-r-2 border-[#E2B646] rounded-full animate-spin mb-4" />
      <p className="text-xs text-zinc-400 font-mono tracking-widest uppercase">{t('player.buffering')}</p>
    </div>
  );
}

export function PlayerErrorOverlay({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center rounded-none">
      <AlertCircle className="w-12 h-12 text-[#E2B646] mb-3 animate-bounce" />
      <h4 className="font-serif font-black italic text-lg text-white">{t('player.playback_error')}</h4>
      <p className="text-xs text-zinc-500 font-sans max-w-sm mt-1 leading-relaxed">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 flex items-center space-x-2 px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none hover:border-[#E2B646] text-xs font-bold font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
      >
        <RefreshCw size={12} />
        <span>{t('player.refresh_connection')}</span>
      </button>
    </div>
  );
}

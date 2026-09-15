'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface VolumeFeedbackOverlayProps {
  feedback: { volume: number; isMuted: boolean } | null;
}

export default function VolumeFeedbackOverlay({ feedback }: VolumeFeedbackOverlayProps) {
  const { t } = useLanguage();

  const volume = feedback?.volume ?? 0;
  const isMuted = feedback?.isMuted ?? false;
  const percentage = Math.round(volume * 100);

  const getIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="w-8 h-8 text-[#E2B646]" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="w-8 h-8 text-[#E2B646]" />;
    }
    return <Volume2 className="w-8 h-8 text-[#E2B646]" />;
  };

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.15 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md px-6 py-4 rounded-xl border border-white/15 shadow-2xl min-w-[130px] space-y-2 select-none"
        >
          <div className="flex items-center justify-center">
            {getIcon()}
          </div>
          <span className="text-white text-base font-mono font-black tracking-wide">
            {isMuted ? (t('player.volume_muted') || 'Muted') : `${percentage}%`}
          </span>
          <div className="w-24 h-1.5 bg-zinc-800/90 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-[#E2B646] transition-all duration-100 ease-out"
              style={{ width: `${isMuted ? 0 : percentage}%` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

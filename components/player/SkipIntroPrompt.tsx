'use client';

import { motion, AnimatePresence } from 'motion/react';
import { SkipForward, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface SkipIntroPromptProps {
  visible: boolean;
  onSkip: () => void;
  onDismiss: () => void;
}

export default function SkipIntroPrompt({ visible, onSkip, onDismiss }: SkipIntroPromptProps) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          className="absolute bottom-24 right-4 sm:right-8 z-30 flex items-center gap-1 bg-zinc-950/95 border border-[#E2B646]/40 shadow-2xl backdrop-blur-md"
        >
          <button
            onClick={onSkip}
            className="flex items-center space-x-2 pl-4 pr-3 py-3 text-[#E2B646] hover:text-white font-serif text-xs font-black tracking-widest uppercase cursor-pointer transition-colors"
            title="Skip Opening / Ending (90s)"
          >
            <SkipForward size={14} className="fill-current" />
            <span>{t('player.skip_intro')}</span>
          </button>
          <button
            onClick={onDismiss}
            className="p-3 text-zinc-600 hover:text-white cursor-pointer transition-colors border-l border-zinc-800"
            title="Dismiss"
          >
            <X size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

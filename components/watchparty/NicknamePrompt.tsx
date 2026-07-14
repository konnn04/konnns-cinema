'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UsersRound } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { MAX_NICKNAME_LEN } from '@/lib/watchParty/constants';

interface NicknamePromptProps {
  initialValue: string;
  onConfirm: (nickname: string) => void;
  onCancel: () => void;
}

export default function NicknamePrompt({ initialValue, onConfirm, onCancel }: NicknamePromptProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-none shadow-2xl"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#E2B646]" />

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-[#E2B646]/10 border border-[#E2B646]/30 rounded-none">
              <UsersRound className="w-8 h-8 text-[#E2B646]" />
            </div>
            <h2 className="font-serif font-black italic text-lg text-white uppercase">{t('watchparty.nickname_title')}</h2>
            <p className="text-zinc-400 font-sans text-xs leading-relaxed">{t('watchparty.nickname_hint')}</p>
          </div>

          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_NICKNAME_LEN))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trimmed) onConfirm(trimmed);
            }}
            placeholder={t('watchparty.nickname_placeholder')}
            maxLength={MAX_NICKNAME_LEN}
            className="mt-6 w-full bg-zinc-900 border border-zinc-800 text-center text-sm text-white px-3 py-2.5 rounded-none focus:outline-none focus:border-[#E2B646]"
          />
          <p className="mt-1 text-right text-[10px] text-zinc-600 font-mono">{value.length}/{MAX_NICKNAME_LEN}</p>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-zinc-800 rounded-none text-zinc-400 hover:text-white hover:border-zinc-700 font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => trimmed && onConfirm(trimmed)}
              disabled={!trimmed}
              className="flex-1 py-3 bg-[#E2B646] hover:bg-[#E2B646]/90 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-none text-black font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {t('common.confirm')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

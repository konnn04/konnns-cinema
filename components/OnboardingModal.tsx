'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Flame, SkipForward, ArrowRight } from 'lucide-react';
import { api, CategoryItem, ANIME_PSEUDO_GENRE } from '@/lib/api';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import { useLanguage } from '@/hooks/useLanguage';

interface OnboardingModalProps {
  onComplete: () => void;
}

// Only rendered by the parent once it has already determined onboarding is needed.
export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { t, language, translateGenre } = useLanguage();
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);
  const [genres, setGenres] = useState<CategoryItem[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGenres()
      .then((data) => {
        setGenres([ANIME_PSEUDO_GENRE, ...data]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load genres for onboarding:', err);
        setLoading(false);
      });
  }, []);

  const handleToggleGenre = (slug: string) => {
    setSelectedGenres((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug]
    );
  };

  const handleFinish = (skip = false) => {
    completeOnboarding(skip ? undefined : selectedGenres);
    onComplete();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-xl"
      >
        {/* Dynamic decorative backdrop circles mimicking lighting bleed */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-[#E2B646]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-brand-orange/5 blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 180 }}
          className="relative w-full max-w-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 rounded-none shadow-2xl overflow-hidden"
        >
          {/* Neon accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-red to-[#E2B646] shadow-lg" />

          {/* Header section */}
          <div className="flex flex-col items-center text-center space-y-3 mb-8">
            <div className="p-3 bg-[#E2B646]/10 rounded-none border border-[#E2B646]/20">
              <Flame className="w-8 h-8 text-[#E2B646] animate-pulse" />
            </div>
            <h2 className="font-serif font-black italic text-2xl md:text-3xl tracking-tight text-white uppercase">
              {language === 'vi' ? 'Cá Nhân Hóa Trải Nghiệm' : 'Personalize Your Cinema'}
            </h2>
            <p className="text-zinc-400 font-sans text-sm max-w-md leading-relaxed">
              {language === 'vi' 
                ? 'Chọn thể loại phim bạn yêu thích. Chúng tôi sẽ tùy biến trang chủ của bạn để ưu tiên các nội dung này.'
                : 'Select your favorite genres. We will customize your dashboard, prioritizing what you love first.'}
            </p>
          </div>

          {/* Genres selections */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-t-2 border-r-2 border-[#E2B646] rounded-full animate-spin" />
              <p className="text-xs text-zinc-500 font-mono">{t('settings.syncing_categories')}</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto pr-2 mb-8 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {genres.map((genre) => {
                  const isSelected = selectedGenres.includes(genre.slug);
                  return (
                    <motion.button
                      key={genre.id}
                      onClick={() => handleToggleGenre(genre.slug)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center justify-between p-3.5 rounded-none border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#E2B646] bg-[#E2B646]/10 text-white shadow-md shadow-[#E2B646]/10'
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <span className="font-sans text-xs font-bold uppercase tracking-wider truncate">
                        {translateGenre(genre.name)}
                      </span>
                      <div
                        className={`w-5 h-5 flex items-center justify-center rounded-none transition-all border ${
                          isSelected
                            ? 'bg-[#E2B646] border-[#E2B646] text-black'
                            : 'border-zinc-800 bg-zinc-950'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-zinc-800/60 pt-6">
            <button
              onClick={() => handleFinish(true)}
              className="flex items-center space-x-2 px-5 py-3 hover:bg-zinc-800/40 rounded-none text-zinc-500 hover:text-zinc-350 font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              <SkipForward size={14} />
              <span>{language === 'vi' ? 'Bỏ qua' : 'Skip for now'}</span>
            </button>

            <button
              onClick={() => handleFinish(false)}
              className="flex items-center space-x-2 px-6 py-3 bg-[#E2B646] rounded-none text-black font-sans text-xs font-bold uppercase tracking-wider hover:bg-white transition-all cursor-pointer"
            >
              <span>{language === 'vi' ? 'Tiếp tục' : 'Continue'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

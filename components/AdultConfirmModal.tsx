'use client';

import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface AdultConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AdultConfirmModal({ onConfirm, onCancel }: AdultConfirmModalProps) {
  const { language } = useLanguage();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-md bg-zinc-950 border border-red-900/40 p-6 md:p-8 rounded-none shadow-2xl"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-600" />

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-none">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="font-serif font-black italic text-xl text-white uppercase">
              {language === 'vi' ? 'Nội Dung Dành Cho Người Trên 18 Tuổi' : 'Content Restricted to Ages 18+'}
            </h2>
            <p className="text-zinc-400 font-sans text-xs leading-relaxed">
              {language === 'vi'
                ? 'Tựa phim này chứa nội dung nhạy cảm, chỉ dành cho người xem từ 18 tuổi trở lên. Bằng việc nhấn "Tôi đã đủ 18 tuổi", bạn xác nhận và tự chịu trách nhiệm về độ tuổi của mình.'
                : 'This title contains mature content intended for viewers aged 18 and older. By clicking "I am 18 or older", you confirm and take sole responsibility for your age.'}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-zinc-800 rounded-none text-zinc-400 hover:text-white hover:border-zinc-700 font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              {language === 'vi' ? 'Quay Lại' : 'Go Back'}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-none text-white font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              {language === 'vi' ? 'Tôi Đã Đủ 18 Tuổi' : 'I Am 18 or Older'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

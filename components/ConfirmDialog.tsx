'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-zinc-950 border border-zinc-800 shadow-2xl"
          >
            <div className="p-5 space-y-4">
              {}
              <div className={`p-2 w-fit ${variant === 'danger' ? 'bg-red-950/30' : 'bg-zinc-900'}`}>
                <AlertTriangle size={20} className={variant === 'danger' ? 'text-red-400' : 'text-[#E2B646]'} />
              </div>

              {}
              <h3 className="font-serif font-black italic text-base text-white">{title}</h3>

              {}
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">{message}</p>

              {}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-black transition-all cursor-pointer ${
                    variant === 'danger' ? 'bg-red-500 hover:bg-red-400' : 'bg-[#E2B646] hover:bg-white'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'default';
    resolve?: (value: boolean) => void;
  }>({ open: false, title: '', message: '' });

  const confirm = (title: string, message: string, variant?: 'danger' | 'default'): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, title, message, variant, resolve });
    });
  };

  const dialogProps = {
    open: state.open,
    title: state.title,
    message: state.message,
    variant: state.variant,
    onConfirm: () => {
      state.resolve?.(true);
      setState((prev) => ({ ...prev, open: false }));
    },
    onCancel: () => {
      state.resolve?.(false);
      setState((prev) => ({ ...prev, open: false }));
    },
  };

  return { confirm, dialogProps };
}

'use client';

import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let toastListeners: Array<(toast: Toast) => void> = [];
let toastId = 0;

export function toast(message: string, type: ToastType = 'info', duration = 4000) {
  const id = `toast-${++toastId}`;
  const t: Toast = { id, type, message, duration };
  toastListeners.forEach((fn) => fn(t));
}

toast.success = (msg: string) => toast(msg, 'success');
toast.error = (msg: string) => toast(msg, 'error');
toast.warning = (msg: string) => toast(msg, 'warning');
toast.info = (msg: string) => toast(msg, 'info');

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, t.duration || 4000);
  }, []);

  useEffect(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { toasts, dismiss };
}

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: 'bg-emerald-950/90', border: 'border-emerald-600/40', icon: 'text-emerald-400', text: 'text-emerald-200' },
  error: { bg: 'bg-red-950/90', border: 'border-red-600/40', icon: 'text-red-400', text: 'text-red-200' },
  warning: { bg: 'bg-amber-950/90', border: 'border-amber-600/40', icon: 'text-amber-400', text: 'text-amber-200' },
  info: { bg: 'bg-zinc-950/90', border: 'border-[#E2B646]/40', icon: 'text-[#E2B646]', text: 'text-zinc-200' },
};

export function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const colors = TOAST_COLORS[t.type];
        const icons: Record<ToastType, string> = {
          success: '✓',
          error: '✕',
          warning: '⚠',
          info: '●',
        };
        return (
          <div
            key={t.id}
            className={`${colors.bg} ${colors.border} border backdrop-blur-md px-4 py-3 shadow-2xl flex items-start gap-3 animate-in slide-in-from-right`}
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            <span className={`${colors.icon} font-bold text-sm mt-0.5`}>{icons[t.type]}</span>
            <p className={`${colors.text} text-xs font-sans flex-1 leading-relaxed`}>{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-zinc-600 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

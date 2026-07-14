'use client';

import { useToast, ToastContainer } from '@/lib/toast';

export default function ToastManager() {
  const { toasts, dismiss } = useToast();
  return <ToastContainer toasts={toasts} dismiss={dismiss} />;
}

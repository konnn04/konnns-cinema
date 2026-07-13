'use client';

import { useLanguage } from '@/hooks/useLanguage';

export default function PageLoader() {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-cinema-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-t-2 border-r-2 border-[#E2B646] rounded-full animate-spin" />
        <span className="font-serif text-[10px] uppercase tracking-[0.3em] text-zinc-500">{t('common.loading')}</span>
      </div>
    </div>
  );
}

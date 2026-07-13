'use client';

import Link from 'next/link';
import { Film, Home, Search } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="relative min-h-screen bg-cinema-bg text-zinc-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="relative">
            <Film className="w-20 h-20 text-zinc-800" strokeWidth={1} />
            <span className="absolute inset-0 flex items-center justify-center font-serif font-black italic text-2xl text-[#E2B646]">
              404
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-serif font-black italic text-2xl sm:text-3xl text-white uppercase tracking-tight">
            Không Tìm Thấy Trang
          </h1>
          <p className="text-sm text-zinc-500 font-sans leading-relaxed">
            Trang bạn tìm không tồn tại, đã bị xoá, hoặc đường dẫn không chính xác.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/">
            <button className="flex items-center space-x-2 px-6 py-3 bg-[#E2B646] text-black rounded-none text-xs font-serif font-black tracking-widest uppercase hover:bg-white transition-all cursor-pointer">
              <Home size={14} />
              <span>{t('not_found.back_home')}</span>
            </button>
          </Link>
          <Link href="/search">
            <button className="flex items-center space-x-2 px-6 py-3 bg-zinc-900 border border-zinc-850 rounded-none text-xs font-bold tracking-widest uppercase text-zinc-400 hover:text-white hover:border-[#E2B646] transition-all cursor-pointer">
              <Search size={14} />
              <span>{t('not_found.search')}</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

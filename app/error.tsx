'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled route error:', error);
  }, [error]);

  return (
    <div className="relative min-h-screen bg-cinema-bg text-zinc-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="p-4 bg-red-950/20 border border-red-900/30">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-serif font-black italic text-2xl sm:text-3xl text-white uppercase tracking-tight">
            Đã Có Lỗi Xảy Ra
          </h1>
          <p className="text-sm text-zinc-500 font-sans leading-relaxed">
            Một lỗi ngoài ý muốn vừa xảy ra khi tải trang này. Bạn có thể thử lại hoặc quay về trang chủ.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="flex items-center space-x-2 px-6 py-3 bg-[#E2B646] text-black rounded-none text-xs font-serif font-black tracking-widest uppercase hover:bg-white transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Thử Lại</span>
          </button>
          <Link href="/">
            <button className="flex items-center space-x-2 px-6 py-3 bg-zinc-900 border border-zinc-850 rounded-none text-xs font-bold tracking-widest uppercase text-zinc-400 hover:text-white hover:border-[#E2B646] transition-all cursor-pointer">
              <Home size={14} />
              <span>Về Trang Chủ</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

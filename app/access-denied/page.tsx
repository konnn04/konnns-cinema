import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: { absolute: 'Access' },
  description: 'Access',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Access',
    description: 'Access',
    siteName: 'Access',
    images: [],
  },
};

// Deliberately minimal and generic -- no site name, branding, or any
// mention of what this site is. Middleware rewrites every blocked route
// here in place (URL unchanged), so this is the only thing an
// unauthenticated visitor can ever see.
export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full border border-zinc-800 flex items-center justify-center">
          <Lock className="w-6 h-6 text-zinc-400" />
        </div>

        <div className="space-y-1">
          <p className="text-sm text-zinc-300">Bạn không có quyền xem trang này.</p>
          <p className="text-sm text-zinc-500">You do not have permission to view this page.</p>
        </div>

        <Link
          href="/access"
          className="inline-block px-6 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs uppercase tracking-wider transition-colors"
        >
          Nhập mã bảo mật / Enter security code
        </Link>
      </div>
    </div>
  );
}

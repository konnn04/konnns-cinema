'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.5-4.6 2.4-7.5 2.4-5.3 0-9.8-3.4-11.3-8.1l-6.5 5C9.5 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C41.4 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { user, signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') || '/';

  const handleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.push(redirectTo);
    } catch {
      setError(t('auth.login_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const alreadySignedIn = !!user && !user.isAnonymous;

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          {t('fav.back')}
        </Link>

        <div className="bg-black/40 border border-zinc-850 p-8 space-y-6 text-center">
          <h1 className="font-serif font-black italic text-xl text-white uppercase">{t('auth.login_title')}</h1>
          <p className="text-xs text-zinc-500 leading-relaxed">{t('auth.login_desc')}</p>

          {alreadySignedIn ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                {user.photoURL && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
                )}
                <span className="text-sm text-zinc-200">{user.displayName || user.email}</span>
              </div>
              <button
                onClick={() => router.push('/')}
                className="w-full py-3 bg-[#E2B646] hover:bg-[#E2B646]/90 text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                {t('nav.home')}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-zinc-100 disabled:opacity-60 text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
              {t('auth.sign_in_google')}
            </button>
          )}

          {error && <p className="text-[10px] text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060608]" />}>
      <LoginContent />
    </Suspense>
  );
}

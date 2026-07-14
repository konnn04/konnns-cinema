'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, UserPen, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useWatchPartyStore } from '@/lib/stores/useWatchPartyStore';
import { useLanguage } from '@/hooks/useLanguage';
import NicknamePrompt from '@/components/watchparty/NicknamePrompt';

// Single entry point for both concerns at once: at a glance, whether you're
// signed in (avatar + green dot vs a plain outline icon), and the two
// actions people actually want from here -- sign in/out, and the Watch
// Party nickname, which otherwise only surfaces mid-flow when creating or
// joining a room.
export default function UserMenu() {
  const { t } = useLanguage();
  const { user, signOutUser } = useAuth();
  const party = useWatchParty();
  const nickname = useWatchPartyStore((s) => s.nickname);
  const setNicknamePref = useWatchPartyStore((s) => s.setNickname);
  const [open, setOpen] = useState(false);
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);

  const isSignedIn = !!user && !user.isAnonymous;

  const confirmNickname = (value: string) => {
    setNicknamePref(value);
    party.setNickname(value);
    setShowNicknamePrompt(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center text-zinc-400 hover:text-[#E2B646] transition-colors cursor-pointer"
        title={isSignedIn ? (user.displayName || user.email || '') : t('auth.sign_in_google')}
      >
        {isSignedIn && user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="w-[18px] h-[18px] rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <User size={16} className={isSignedIn ? 'text-[#E2B646]' : ''} />
        )}
        {isSignedIn && <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-zinc-950" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-3 w-56 bg-zinc-950 border border-zinc-800 z-50 shadow-2xl">
            <div className="p-3 border-b border-zinc-900">
              {isSignedIn ? (
                <>
                  <p className="text-xs font-bold text-zinc-200 truncate">{user.displayName || user.email}</p>
                  <p className="text-[9px] text-emerald-500 uppercase tracking-wider mt-0.5">{t('auth.signed_in')}</p>
                </>
              ) : (
                <p className="text-[10px] text-zinc-500">{t('auth.not_signed_in')}</p>
              )}
            </div>

            <button
              onClick={() => { setShowNicknamePrompt(true); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer text-left"
            >
              <UserPen size={13} className="shrink-0" />
              <span className="flex-1 truncate">{nickname || t('auth.set_nickname')}</span>
            </button>

            {isSignedIn ? (
              <button
                onClick={() => { signOutUser(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-950/30 cursor-pointer border-t border-zinc-900 text-left"
              >
                <LogOut size={13} /> {t('auth.sign_out')}
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#E2B646] hover:bg-zinc-900 cursor-pointer border-t border-zinc-900"
              >
                <LogIn size={13} /> {t('auth.sign_in_google')}
              </Link>
            )}
          </div>
        </>
      )}

      {showNicknamePrompt && (
        <NicknamePrompt initialValue={nickname} onConfirm={confirmNickname} onCancel={() => setShowNicknamePrompt(false)} />
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Radio, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useWatchPartyRoomStore } from '@/lib/stores/useWatchPartyRoomStore';
import { useWatchPartyStore } from '@/lib/stores/useWatchPartyStore';
import { isValidRoomCodeFormat, normalizeRoomCode, ROOM_CODE_LENGTH } from '@/lib/watchParty/roomCode';
import NicknamePrompt from '@/components/watchparty/NicknamePrompt';

export default function WatchPartySection() {
  const { t } = useLanguage();
  const router = useRouter();
  const party = useWatchParty();

  const roomCode = useWatchPartyRoomStore((s) => s.roomCode);
  const movieSlug = useWatchPartyRoomStore((s) => s.movieSlug);
  const episodeSlug = useWatchPartyRoomStore((s) => s.episodeSlug);
  const connectionStatus = useWatchPartyRoomStore((s) => s.connectionStatus);
  const lastError = useWatchPartyRoomStore((s) => s.lastError);

  const nickname = useWatchPartyStore((s) => s.nickname);
  const setNicknamePref = useWatchPartyStore((s) => s.setNickname);

  const [codeInput, setCodeInput] = useState('');
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (joining && roomCode && movieSlug && episodeSlug) {
      router.push(`/watch/${movieSlug}/${episodeSlug}?room=${roomCode}`);
    }
  }, [joining, roomCode, movieSlug, episodeSlug, router]);

  const doJoin = (name: string) => {
    setJoining(true);
    party.joinRoom(normalizeRoomCode(codeInput), name);
  };

  const handleJoinClick = () => {
    const code = normalizeRoomCode(codeInput);
    if (!isValidRoomCodeFormat(code)) return;
    if (!nickname) {
      setShowNicknamePrompt(true);
      return;
    }
    doJoin(nickname);
  };

  const confirmNickname = (value: string) => {
    setNicknamePref(value);
    setShowNicknamePrompt(false);
    doJoin(value);
  };

  const alreadyInRoom = !!roomCode && !joining;

  return (
    <section className="px-4 sm:px-8 md:px-12 py-10">
      <div className="relative overflow-hidden border border-[#E2B646]/20 bg-gradient-to-br from-zinc-950 via-zinc-950 to-[#E2B646]/5 rounded-none p-8 sm:p-12">
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-lg">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E2B646]/10 border border-[#E2B646]/30 text-[#E2B646] text-[9px] font-mono font-bold uppercase tracking-[0.2em]">
              <Radio size={11} />
              {t('watchparty.section_badge')}
            </span>
            <h2 className="font-serif font-black italic text-2xl sm:text-3xl text-white leading-tight">
              {t('watchparty.section_title')}
            </h2>
            <p className="font-sans text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {t('watchparty.section_desc')}
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col gap-2 shrink-0">
            {alreadyInRoom ? (
              <button
                onClick={() => movieSlug && episodeSlug && router.push(`/watch/${movieSlug}/${episodeSlug}?room=${roomCode}`)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#E2B646] hover:bg-[#E2B646]/90 rounded-none text-black font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                {t('watchparty.continue_room')} ({roomCode})
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, ROOM_CODE_LENGTH))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoinClick(); }}
                    placeholder={t('watchparty.enter_code')}
                    className="w-40 sm:w-48 bg-zinc-900 border border-zinc-800 text-center tracking-[0.3em] text-sm text-white px-3 py-3 rounded-none focus:outline-none focus:border-[#E2B646] font-mono uppercase"
                  />
                  <button
                    onClick={handleJoinClick}
                    disabled={connectionStatus !== 'connected' || !isValidRoomCodeFormat(normalizeRoomCode(codeInput))}
                    className="flex items-center gap-2 px-6 py-3 bg-[#E2B646] hover:bg-[#E2B646]/90 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-none text-black font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Users size={14} />
                    {t('watchparty.join_room')}
                  </button>
                </div>
                {lastError && <p className="text-[10px] text-red-500">{lastError.message}</p>}
              </>
            )}
          </div>
        </div>
      </div>

      {showNicknamePrompt && (
        <NicknamePrompt initialValue={nickname} onConfirm={confirmNickname} onCancel={() => setShowNicknamePrompt(false)} />
      )}
    </section>
  );
}

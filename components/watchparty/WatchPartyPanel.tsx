'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Copy, Check, Crown, LogOut, MessageSquare, ArrowRightLeft, BadgeCheck, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useWatchPartyRoomStore } from '@/lib/stores/useWatchPartyRoomStore';
import { useWatchPartyStore } from '@/lib/stores/useWatchPartyStore';
import { isValidRoomCodeFormat, normalizeRoomCode, ROOM_CODE_LENGTH } from '@/lib/watchParty/roomCode';
import { COPY_FEEDBACK_MS } from '@/lib/watchParty/constants';
import NicknamePrompt from './NicknamePrompt';
import ChatPanel from './ChatPanel';

interface WatchPartyPanelProps {
  movieSlug: string;
  episodeSlug: string;
  initialJoinCode?: string;
  // Current player position, so creating a room seeds the room's playback
  // state with where the host actually is instead of defaulting to 0.
  currentTime?: number;
  isPlaying?: boolean;
}

export default function WatchPartyPanel({ movieSlug, episodeSlug, initialJoinCode, currentTime, isPlaying }: WatchPartyPanelProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const party = useWatchParty();

  const roomCode = useWatchPartyRoomStore((s) => s.roomCode);
  const isHost = useWatchPartyRoomStore((s) => s.isHost());
  const allowMemberControl = useWatchPartyRoomStore((s) => s.allowMemberControl);
  const members = useWatchPartyRoomStore((s) => s.members);
  const myUid = useWatchPartyRoomStore((s) => s.myUid);
  const connectionStatus = useWatchPartyRoomStore((s) => s.connectionStatus);
  const lastError = useWatchPartyRoomStore((s) => s.lastError);

  const nickname = useWatchPartyStore((s) => s.nickname);
  const setNicknamePref = useWatchPartyStore((s) => s.setNickname);
  const showChatPanel = useWatchPartyStore((s) => s.showChatPanel);
  const setShowChatPanel = useWatchPartyStore((s) => s.setShowChatPanel);
  const showRoomInfo = useWatchPartyStore((s) => s.showRoomInfo);
  const setShowRoomInfo = useWatchPartyStore((s) => s.setShowRoomInfo);

  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode ?? '');
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);
  const [copied, setCopied] = useState(false);

  const confirmNickname = (value: string) => {
    setNicknamePref(value);
    if (pendingAction === 'create') {
      party.createRoom(movieSlug, episodeSlug, value, { isPlaying: !!isPlaying, currentTime: currentTime ?? 0 });
    } else if (pendingAction === 'join') {
      party.joinRoom(normalizeRoomCode(joinCodeInput), value);
    }
    setPendingAction(null);
  };

  const handleCreate = () => {
    if (!nickname) { setPendingAction('create'); return; }
    party.createRoom(movieSlug, episodeSlug, nickname, { isPlaying: !!isPlaying, currentTime: currentTime ?? 0 });
  };

  const handleJoin = () => {
    const code = normalizeRoomCode(joinCodeInput);
    if (!isValidRoomCodeFormat(code)) return;
    if (!nickname) { setPendingAction('join'); return; }
    party.joinRoom(code, nickname);
  };

  const handleCopyLink = () => {
    if (!roomCode || typeof window === 'undefined') return;
    const url = `${window.location.origin}${pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  };

  return (
    <div className="space-y-3">
      {pendingAction && (
        <NicknamePrompt initialValue={nickname} onConfirm={confirmNickname} onCancel={() => setPendingAction(null)} />
      )}

      <span className="text-[10px] uppercase font-serif tracking-[0.2em] font-bold text-[#E2B646]">{t('watchparty.title')}</span>

      {!roomCode ? (
        <div className="bg-black/40 border border-zinc-850 rounded-none overflow-hidden">
          {connectionStatus !== 'connected' && (
            <p className="px-4 pt-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              {connectionStatus === 'connecting' ? t('watchparty.connecting') : t('watchparty.disconnected')}
            </p>
          )}

          <div className="p-4 space-y-4">
            <button
              onClick={handleCreate}
              disabled={connectionStatus !== 'connected'}
              className="w-full py-3 bg-[#E2B646] hover:bg-[#E2B646]/90 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-none text-black font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {t('watchparty.create_room')}
            </button>

            <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono uppercase">
              <div className="flex-1 h-px bg-zinc-900" />
              {t('watchparty.or')}
              <div className="flex-1 h-px bg-zinc-900" />
            </div>

            <div className="space-y-2">
              <input
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, ROOM_CODE_LENGTH))}
                placeholder={t('watchparty.enter_code')}
                className="w-full bg-zinc-900 border border-zinc-800 text-center tracking-[0.3em] text-sm text-white px-3 py-2.5 rounded-none focus:outline-none focus:border-[#E2B646] font-mono uppercase"
              />
              <button
                onClick={handleJoin}
                disabled={connectionStatus !== 'connected' || !isValidRoomCodeFormat(normalizeRoomCode(joinCodeInput))}
                className="w-full py-3 border border-[#E2B646]/50 hover:bg-[#E2B646]/10 disabled:border-zinc-800 disabled:text-zinc-600 rounded-none text-[#E2B646] font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {t('watchparty.join_room')}
              </button>
            </div>

            {lastError && <p className="text-[10px] text-red-500">{lastError.message}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Room info -- collapsible on its own so it can be tucked away
              while keeping the chat section (below) visible. */}
          <div className="bg-black/40 border border-zinc-850 rounded-none overflow-hidden">
            <button
              onClick={() => setShowRoomInfo(!showRoomInfo)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
                <Users size={12} className="text-[#E2B646]" />
                {t('watchparty.room_code')}: <span className="text-[#E2B646] tracking-[0.2em]">{roomCode}</span>
                <span className="text-zinc-600">({members.length})</span>
              </span>
              {showRoomInfo ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
            </button>

            {showRoomInfo && (
              <div className="p-4 pt-0 space-y-5 max-h-[420px] overflow-y-auto no-scrollbar border-t border-zinc-900">
                <div className="text-center space-y-2 pt-4">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{t('watchparty.room_code')}</p>
                  <p className="text-2xl font-mono font-black tracking-[0.4em] text-[#E2B646]">{roomCode}</p>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? t('watchparty.link_copied') : t('watchparty.copy_link')}
                  </button>
                </div>

                {isHost && (
                  <label className="flex items-center justify-between py-2 border-t border-b border-zinc-900 cursor-pointer">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{t('watchparty.allow_member_control')}</span>
                    <input
                      type="checkbox"
                      checked={allowMemberControl}
                      onChange={(e) => party.setAllowMemberControl(e.target.checked)}
                      className="accent-[#E2B646] w-4 h-4 cursor-pointer"
                    />
                  </label>
                )}

                <div className="space-y-1.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{t('watchparty.members')} ({members.length})</p>
                  {members.map((m) => (
                    <div key={m.uid} className="flex items-center gap-2 text-xs text-zinc-300 py-1">
                      {m.isHost && <Crown size={12} className="text-[#E2B646] shrink-0" />}
                      <span className="truncate flex-1">{m.nickname}</span>
                      {m.verified && <BadgeCheck size={12} className="text-blue-400 shrink-0" />}
                      {m.uid === myUid && <span className="text-zinc-600 text-[10px]">({t('watchparty.you')})</span>}
                      {isHost && m.uid !== myUid && (
                        <button
                          onClick={() => party.transferHost(m.uid)}
                          title={t('watchparty.transfer_host')}
                          className="text-zinc-600 hover:text-[#E2B646] cursor-pointer shrink-0"
                        >
                          <ArrowRightLeft size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => party.leaveRoom()}
                  className="w-full py-2.5 border border-red-900/40 hover:bg-red-950/30 rounded-none text-red-500 font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut size={13} />
                  {t('watchparty.leave_room')}
                </button>
              </div>
            )}
          </div>

          {/* Chat -- its own section, independent from room info above. */}
          <div className="bg-black/40 border border-zinc-850 rounded-none overflow-hidden">
            <button
              onClick={() => setShowChatPanel(!showChatPanel)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
                <MessageSquare size={12} className="text-[#E2B646]" />
                {t('watchparty.chat_toggle')}
              </span>
              {showChatPanel ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
            </button>

            {showChatPanel && (
              <div className="h-[360px] border-t border-zinc-900">
                <ChatPanel />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

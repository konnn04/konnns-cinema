'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Heart, Laugh, Angry, ThumbsUp, PartyPopper, Send, Eye, EyeOff, BadgeCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useChatComposer } from '@/hooks/useChatComposer';
import { useWatchPartyRoomStore } from '@/lib/stores/useWatchPartyRoomStore';
import { useWatchPartyStore } from '@/lib/stores/useWatchPartyStore';
import { MAX_CHAT_LEN, type ReactionIcon } from '@/lib/watchParty/constants';
import type { ChatMessageSnapshot } from '@/lib/watchParty/types';
import type { SystemEvent } from '@/lib/stores/useWatchPartyRoomStore';

const REACTION_BUTTONS: { icon: ReactionIcon; Comp: typeof Heart }[] = [
  { icon: 'heart', Comp: Heart },
  { icon: 'laugh', Comp: Laugh },
  { icon: 'angry', Comp: Angry },
  { icon: 'thumbsup', Comp: ThumbsUp },
  { icon: 'party', Comp: PartyPopper },
];

type FeedItem =
  | { kind: 'message'; data: ChatMessageSnapshot }
  | { kind: 'system'; data: SystemEvent };

export default function ChatPanel() {
  const { t } = useLanguage();
  const party = useWatchParty();
  const messages = useWatchPartyRoomStore((s) => s.chatMessages);
  const systemEvents = useWatchPartyRoomStore((s) => s.systemEvents);
  const myUid = useWatchPartyRoomStore((s) => s.myUid);
  const showFloatingComments = useWatchPartyStore((s) => s.showFloatingComments);
  const setShowFloatingComments = useWatchPartyStore((s) => s.setShowFloatingComments);

  const { text, setText, remainingCooldown, canSend, send } = useChatComposer();
  const listRef = useRef<HTMLDivElement>(null);

  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [
      ...messages.map((m): FeedItem => ({ kind: 'message', data: m })),
      ...systemEvents.map((e): FeedItem => ({ kind: 'system', data: e })),
    ];
    return items.sort((a, b) => a.data.createdAt - b.data.createdAt);
  }, [messages, systemEvents]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [feed]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-3 pt-2">
        <button
          onClick={() => setShowFloatingComments(!showFloatingComments)}
          className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-zinc-500 hover:text-white cursor-pointer"
          title={t('watchparty.toggle_floating')}
        >
          {showFloatingComments ? <Eye size={11} /> : <EyeOff size={11} />}
          {t('watchparty.toggle_floating')}
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 px-3 py-2 no-scrollbar">
        {feed.length === 0 && (
          <p className="text-[10px] text-zinc-600 text-center py-6">{t('watchparty.chat_empty')}</p>
        )}
        {feed.map((item) =>
          item.kind === 'system' ? (
            <p key={item.data.id} className="text-center text-[10px] text-zinc-600 italic py-0.5">
              {item.data.text}
            </p>
          ) : (
            <div key={item.data.id} className="text-xs leading-snug">
              <span className={`font-semibold ${item.data.uid === myUid ? 'text-[#E2B646]' : 'text-zinc-300'}`}>{item.data.nickname}</span>
              {item.data.verified && <BadgeCheck size={11} className="inline-block text-blue-400 ml-0.5 -mt-0.5" />}
              <span className="text-zinc-500">: </span>
              <span className="text-zinc-200 break-words">{item.data.text}</span>
            </div>
          )
        )}
      </div>

      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-zinc-900">
        {REACTION_BUTTONS.map(({ icon, Comp }) => (
          <button
            key={icon}
            onClick={() => party.sendReaction(icon)}
            className="p-1.5 text-zinc-400 hover:text-[#E2B646] hover:bg-zinc-900 rounded-none cursor-pointer transition-colors"
          >
            <Comp size={15} />
          </button>
        ))}
      </div>

      <div className="px-3 pb-3 space-y-1">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder={remainingCooldown > 0 ? t('watchparty.chat_cooldown', { seconds: remainingCooldown }) : t('watchparty.chat_placeholder')}
            className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-none focus:outline-none focus:border-[#E2B646]"
          />
          <button
            onClick={send}
            disabled={!canSend}
            className="p-2 bg-[#E2B646] disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded-none cursor-pointer disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-right text-[9px] text-zinc-700 font-mono">{text.length}/{MAX_CHAT_LEN}</p>
      </div>
    </div>
  );
}

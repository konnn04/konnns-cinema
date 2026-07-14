'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useChatComposer } from '@/hooks/useChatComposer';
import { MAX_CHAT_LEN } from '@/lib/watchParty/constants';

export default function QuickChatInput() {
  const { t } = useLanguage();
  const { text, setText, remainingCooldown, canSend, send } = useChatComposer();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = () => {
    send();
    inputRef.current?.focus();
  };

  return (
    <div
      className="absolute bottom-20 right-4 z-30 flex flex-col items-end gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {isOpen && (
        <div className="flex items-center gap-2 bg-zinc-950/95 border border-zinc-800 p-2 w-64 max-w-[70vw] shadow-2xl">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
              if (e.key === 'Escape') setIsOpen(false);
            }}
            placeholder={remainingCooldown > 0 ? t('watchparty.chat_cooldown', { seconds: remainingCooldown }) : t('watchparty.chat_placeholder')}
            maxLength={MAX_CHAT_LEN}
            className="flex-1 min-w-0 bg-transparent text-xs text-white px-1 py-1 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="p-1.5 bg-[#E2B646] disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded-none cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <Send size={13} />
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        title={t('watchparty.chat_placeholder')}
        className="p-2.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer shrink-0"
      >
        {isOpen ? <X size={14} /> : <MessageCircle size={14} />}
      </button>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useWatchParty } from '@/hooks/useWatchParty';
import { CHAT_COOLDOWN_MS, CHAT_COOLDOWN_TICK_MS, MAX_CHAT_LEN } from '@/lib/watchParty/constants';

export function useChatComposer() {
  const party = useWatchParty();
  const [text, setTextRaw] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), CHAT_COOLDOWN_TICK_MS);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const remainingCooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const canSend = text.trim().length > 0 && remainingCooldown <= 0;

  const setText = (value: string) => setTextRaw(value.slice(0, MAX_CHAT_LEN));

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || remainingCooldown > 0) return;
    party.sendChat(trimmed);
    setTextRaw('');
    const until = Date.now() + CHAT_COOLDOWN_MS;
    setCooldownUntil(until);
    setNow(Date.now());
  };

  return { text, setText, remainingCooldown, canSend, send };
}

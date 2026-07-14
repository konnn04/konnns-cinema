'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWatchPartyRoomStore } from '@/lib/stores/useWatchPartyRoomStore';
import { useWatchPartyStore } from '@/lib/stores/useWatchPartyStore';
import { CHAT_LANE_BASE_OFFSET_PERCENT, CHAT_LANE_COUNT, CHAT_LANE_SPACING_PERCENT, CHAT_SCROLL_DURATION_SECONDS } from '@/lib/watchParty/constants';

function laneFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % CHAT_LANE_COUNT;
}

export default function FloatingComments() {
  const showFloatingComments = useWatchPartyStore((s) => s.showFloatingComments);
  const floatingEvents = useWatchPartyRoomStore((s) => s.floatingEvents);
  const events = useMemo(() => floatingEvents.filter((e) => e.kind === 'chat'), [floatingEvents]);

  if (!showFloatingComments) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {events.map((e) => (
          <motion.div
            key={e.id}
            initial={{ x: '100%' }}
            animate={{ x: '-120%' }}
            transition={{ duration: CHAT_SCROLL_DURATION_SECONDS, ease: 'linear' }}
            className="absolute whitespace-nowrap text-sm font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
            style={{ top: `${CHAT_LANE_BASE_OFFSET_PERCENT + laneFor(e.id) * CHAT_LANE_SPACING_PERCENT}%` }}
          >
            <span className="text-[#E2B646] font-semibold">{e.nickname}: </span>
            {e.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

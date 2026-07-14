'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Laugh, Angry, ThumbsUp, PartyPopper } from 'lucide-react';
import { useWatchPartyRoomStore } from '@/lib/stores/useWatchPartyRoomStore';
import {
  REACTION_ANIMATION_DURATION_SECONDS, REACTION_RISE_DISTANCE_PX, REACTION_SCALE_END,
  REACTION_SCALE_START, REACTION_SPREAD_MIN_PERCENT, REACTION_SPREAD_RANGE_PERCENT,
  type ReactionIcon,
} from '@/lib/watchParty/constants';

const ICONS: Record<ReactionIcon, typeof Heart> = {
  heart: Heart,
  laugh: Laugh,
  angry: Angry,
  thumbsup: ThumbsUp,
  party: PartyPopper,
};

function xFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return (hash % REACTION_SPREAD_RANGE_PERCENT) + REACTION_SPREAD_MIN_PERCENT;
}

// Facebook-Live style: reaction icons spawn near the bottom and float
// upward while fading out. Kept separate from FloatingComments -- reactions
// are not chat messages and don't appear in the chat log.
export default function FloatingReactions() {
  // Select the raw (referentially stable) array and filter in a memo -- see
  // the same note in FloatingComments.tsx.
  const floatingEvents = useWatchPartyRoomStore((s) => s.floatingEvents);
  const events = useMemo(() => floatingEvents.filter((e) => e.kind === 'reaction' && e.icon), [floatingEvents]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {events.map((e) => {
          const Icon = ICONS[e.icon as ReactionIcon];
          return (
            <motion.div
              key={e.id}
              initial={{ y: 0, opacity: 1, scale: REACTION_SCALE_START }}
              animate={{ y: -REACTION_RISE_DISTANCE_PX, opacity: 0, scale: REACTION_SCALE_END }}
              transition={{ duration: REACTION_ANIMATION_DURATION_SECONDS, ease: 'easeOut' }}
              className="absolute bottom-4 text-[#E2B646]"
              style={{ left: `${xFor(e.id)}%` }}
            >
              <Icon size={28} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

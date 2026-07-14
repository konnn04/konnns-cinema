'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useWatchPartyStore } from '@/lib/stores/useWatchPartyStore';

export default function FloatingCommentsToggle() {
  const { t } = useLanguage();
  const showFloatingComments = useWatchPartyStore((s) => s.showFloatingComments);
  const setShowFloatingComments = useWatchPartyStore((s) => s.setShowFloatingComments);

  return (
    <button
      onClick={() => setShowFloatingComments(!showFloatingComments)}
      title={t('watchparty.toggle_floating')}
      className="absolute bottom-20 left-4 z-30 p-2.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
    >
      {showFloatingComments ? <Eye size={14} /> : <EyeOff size={14} />}
    </button>
  );
}

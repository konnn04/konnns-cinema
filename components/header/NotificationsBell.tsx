'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useFavoritesStore } from '@/lib/stores/useFavoritesStore';
import { useWatchHistoryStore } from '@/lib/stores/useWatchHistoryStore';
import { useLanguage } from '@/hooks/useLanguage';

interface Notification {
  id: string;
  title: string;
  desc: string;
  date: string;
  unread: boolean;
  link?: string;
}

export default function NotificationsBell() {
  const { t } = useLanguage();
  const pinnedCount = useFavoritesStore((s) => s.favorites.length);
  const lastWatched = useWatchHistoryStore((s) => s.history[0]);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Derived from the favorites/history stores, so this updates instantly
  // whenever a title is pinned or a watch session starts -- no polling needed.
  const notifications: Notification[] = useMemo(() => {
    const alerts: Notification[] = [
      {
        id: 'welcome-alert',
        title: t('notif.welcome_title'),
        desc: t('notif.welcome_desc'),
        date: t('notif.time_just_now'),
        unread: !readIds.has('welcome-alert'),
      },
    ];

    if (pinnedCount > 0) {
      alerts.push({
        id: 'pin-tip',
        title: t('notif.favorites_title'),
        desc: t('notif.favorites_desc', { count: pinnedCount }),
        date: t('notif.time_hours_ago'),
        unread: false,
      });
    }

    if (lastWatched) {
      alerts.push({
        id: 'watch-reminder',
        title: t('notif.history_title'),
        desc: t('notif.history_desc', { name: lastWatched.name }),
        date: t('notif.time_recently'),
        unread: !readIds.has('watch-reminder'),
        link: `/movie/${lastWatched.slug}`,
      });
    }

    return alerts;
  }, [pinnedCount, lastWatched, readIds, t]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  return (
    <div ref={notifRef} className="relative">
      <button
        onClick={() => setShowNotifications((v) => !v)}
        className="text-zinc-400 hover:text-white transition-colors relative p-1 cursor-pointer"
        title={t('common.notifications')}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-100 border border-cinema-bg text-black text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-3 w-[280px] sm:w-[340px] bg-zinc-950 border border-zinc-900 rounded-none shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-zinc-900 flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">{t('common.notifications')}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[9px] hover:text-[#E2B646] text-zinc-600 transition-colors uppercase font-mono cursor-pointer"
              >
                {t('common.clear_unread')}
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto no-scrollbar py-1">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 border-b border-zinc-950 flex flex-col space-y-1 hover:bg-zinc-900/30 transition-colors ${
                    notif.unread ? 'bg-[#E2B646]/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-serif ${notif.unread ? 'text-white' : 'text-zinc-400'}`}>
                      {notif.title}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-600">{notif.date}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">{notif.desc}</p>
                  {notif.link && (
                    <Link
                      href={notif.link}
                      onClick={() => setShowNotifications(false)}
                      className="text-[9px] text-[#E2B646] hover:underline font-mono inline-flex items-center space-x-1 mt-1"
                    >
                      <span>{t('common.continue')}</span>
                      <span>&rarr;</span>
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <p className="p-6 text-center text-xs text-zinc-600 font-sans">{t('common.no_alerts')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

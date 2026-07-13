'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sliders, Sparkles, Check, RefreshCw, Trash2, ArrowLeft, ShieldAlert, Play, Heart, Bell, Languages } from 'lucide-react';
import { api, CategoryItem, ANIME_PSEUDO_GENRE } from '@/lib/api';
import { isAdultVerified, setAdultVerified } from '@/lib/adult';
import { useAdultContentStore } from '@/lib/stores/useAdultContentStore';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import AdultConfirmModal from '@/components/AdultConfirmModal';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  // Genres list fetched from the API for display (selection state lives in the preferences store)
  const [genres, setGenres] = useState<CategoryItem[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);

  const selectedGenres = usePreferencesStore((s) => s.favoriteGenres);
  const toggleFavoriteGenre = usePreferencesStore((s) => s.toggleFavoriteGenre);
  const defaultSpeed = usePreferencesStore((s) => s.playerDefaultSpeed);
  const setPlayerDefaultSpeed = usePreferencesStore((s) => s.setPlayerDefaultSpeed);
  const autoNext = usePreferencesStore((s) => s.playerAutoNext);
  const setPlayerAutoNext = usePreferencesStore((s) => s.setPlayerAutoNext);
  const imageEnhance = usePreferencesStore((s) => s.playerImageEnhance);
  const setPlayerImageEnhance = usePreferencesStore((s) => s.setPlayerImageEnhance);

  const adultUnblur = useAdultContentStore((s) => s.unblurEnabled);
  const setAdultUnblurEnabled = useAdultContentStore((s) => s.setUnblurEnabled);
  const [showAdultConfirm, setShowAdultConfirm] = useState(false);

  useEffect(() => {
    api.getGenres()
      .then((data) => {
        setGenres([ANIME_PSEUDO_GENRE, ...data]);
        setLoadingGenres(false);
      })
      .catch((err) => {
        console.error('Failed to load genres for settings:', err);
        setLoadingGenres(false);
      });
  }, []);

  const handleAdultUnblurToggle = () => {
    if (!adultUnblur) {
      // Turning ON requires an explicit age declaration, same as watching an 18+ title.
      if (!isAdultVerified()) {
        setShowAdultConfirm(true);
        return;
      }
      setAdultUnblurEnabled(true);
    } else {
      setAdultUnblurEnabled(false);
    }
  };

  const handleAdultConfirm = () => {
    setAdultVerified();
    setAdultUnblurEnabled(true);
    setShowAdultConfirm(false);
  };

  const handleToggleGenre = (slug: string) => toggleFavoriteGenre(slug);
  const handleSpeedChange = (rate: number) => setPlayerDefaultSpeed(rate);
  const handleAutoNextToggle = () => setPlayerAutoNext(!autoNext);
  const handleImageEnhanceToggle = () => setPlayerImageEnhance(!imageEnhance);

  // Nuke completely clears all local & session databases, restoring fresh onboarding states
  const handleClearAllData = () => {
    if (typeof window !== 'undefined') {
      if (confirm('CRITICAL ACTION: This will completely wipe your favorites, watch history, reminder subscriptions, and preferences. Proceed with reset?')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-cinema-bg text-zinc-100 select-none pb-20 md:pb-0">
      <Header />

      <main className="w-full pt-24 max-w-4xl mx-auto px-4 sm:px-8 md:px-12 py-8 space-y-8">
        
        {/* Page header banner */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center space-x-3">
            <Sliders className="text-[#E2B646] w-6 h-6 animate-pulse" />
            <h1 className="font-serif font-black italic text-2xl sm:text-3xl tracking-tight text-white uppercase">
              Preferences &amp; Settings
            </h1>
          </div>
          <Link href="/">
            <button className="flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 border border-zinc-850 rounded-none hover:border-[#E2B646] text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer">
              <ArrowLeft size={12} />
              <span>Back Home</span>
            </button>
          </Link>
        </div>

        {/* Section 0: Language */}
        <div className="p-6 bg-black/40 border border-zinc-850 rounded-none space-y-4">
          <h2 className="font-serif font-black italic text-base text-white tracking-wide uppercase flex items-center space-x-2">
            <Languages size={16} className="text-[#E2B646]" />
            <span>{t('settings.language_label')}</span>
          </h2>

          <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-850 rounded-none">
            <p className="text-[11px] text-zinc-500 font-sans max-w-md">{t('settings.language_desc')}</p>
            <div className="flex gap-2 shrink-0 ml-4">
              {(['vi', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-4 py-2 rounded-none text-xs font-mono font-bold uppercase border transition-colors cursor-pointer ${
                    language === lang
                      ? 'border-[#E2B646] bg-[#E2B646]/10 text-white'
                      : 'border-zinc-850 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 1: Movie Player Presets */}
        <div className="p-6 bg-black/40 border border-zinc-850 rounded-none space-y-6">
          <h2 className="font-serif font-black italic text-base text-white tracking-wide uppercase flex items-center space-x-2">
            <Play size={16} className="text-[#E2B646] fill-current" />
            <span>Player Defaults Preset</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Auto Next Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-850 rounded-none">
              <div>
                <h4 className="text-xs font-bold text-zinc-200">Episode Auto-Advance</h4>
                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Automatically advances to next episode on finish</p>
              </div>
              <button
                onClick={handleAutoNextToggle}
                className={`w-12 h-6 rounded-none p-1 cursor-pointer transition-colors duration-300 ${
                  autoNext ? 'bg-[#E2B646]' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-black rounded-none transition-transform duration-300 transform ${
                    autoNext ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Global Image sharpening boost trigger */}
            <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-850 rounded-none">
              <div>
                <h4 className="text-xs font-bold text-zinc-200">Image Enhancer Overlay</h4>
                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Applies sharpening visual filter boost inside player</p>
              </div>
              <button
                onClick={handleImageEnhanceToggle}
                className={`w-12 h-6 rounded-none p-1 cursor-pointer transition-colors duration-300 ${
                  imageEnhance ? 'bg-[#E2B646]' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-black rounded-none transition-transform duration-300 transform ${
                    imageEnhance ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Playback rate presets */}
            <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-900/40 border border-zinc-850 rounded-none gap-4">
              <div>
                <h4 className="text-xs font-bold text-zinc-200">Playback Speed defaults</h4>
                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Sets active multiplier speed for beginning sessions</p>
              </div>
              <div className="flex gap-2">
                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      rate === defaultSpeed
                        ? 'border-[#E2B646] bg-[#E2B646]/10 text-white'
                        : 'border-zinc-850 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Personal Genre sorting rows */}
        <div className="p-6 bg-black/40 border border-zinc-850 rounded-none space-y-6">
          <h2 className="font-serif font-black italic text-base text-white tracking-wide uppercase flex items-center space-x-2">
            <Heart size={16} className="text-[#E2B646] fill-current" />
            <span>Customize Home Row Sorting</span>
          </h2>
          <p className="text-[11px] text-zinc-500 font-sans">
            Update your choices here. Selected categories generate prioritized rows on your homepage dashboard instantly.
          </p>

          {loadingGenres ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="w-8 h-8 border-t-2 border-r-2 border-[#E2B646] rounded-none animate-spin" />
              <p className="text-[10px] text-zinc-600 font-mono">Syncing categories...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {genres.map((genre) => {
                const isSelected = selectedGenres.includes(genre.slug);
                return (
                  <button
                    key={genre.id}
                    onClick={() => handleToggleGenre(genre.slug)}
                    className={`flex items-center justify-between p-3.5 rounded-none border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#E2B646] bg-[#E2B646]/10 text-white shadow-inner'
                        : 'border-zinc-850 bg-zinc-900/15 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    <span className="font-sans text-xs font-semibold truncate pr-2">{genre.name}</span>
                    <div
                      className={`w-4 h-4 flex items-center justify-center rounded-none transition-all border ${
                        isSelected
                          ? 'bg-[#E2B646] border-[#E2B646] text-black'
                          : 'border-zinc-850 bg-zinc-950'
                      }`}
                    >
                      {isSelected && <Check size={10} className="stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2.5: 18+ Content Preference */}
        <div className="p-6 bg-black/40 border border-zinc-850 rounded-none space-y-6">
          <h2 className="font-serif font-black italic text-base text-white tracking-wide uppercase flex items-center space-x-2">
            <ShieldAlert size={16} className="text-red-500" />
            <span>Nội Dung 18+</span>
          </h2>

          <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-850 rounded-none">
            <div>
              <h4 className="text-xs font-bold text-zinc-200">Hiển thị thumbnail 18+ không che mờ</h4>
              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Mặc định, ảnh bìa của phim gắn nhãn 18+ sẽ bị làm mờ ở mọi nơi trên trang. Bật lựa chọn này để hiển thị bình thường.</p>
            </div>
            <button
              onClick={handleAdultUnblurToggle}
              className={`w-12 h-6 rounded-none p-1 cursor-pointer transition-colors duration-300 shrink-0 ml-4 ${
                adultUnblur ? 'bg-red-600' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-4 h-4 bg-black rounded-none transition-transform duration-300 transform ${
                  adultUnblur ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 3: Safe Nuke Command Zone */}
        <div className="p-6 bg-red-950/10 border border-red-950/20 rounded-none space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="text-red-500 animate-pulse w-5 h-5" />
            <h2 className="font-serif font-black italic text-base text-white tracking-wide uppercase">
              Danger Zone
            </h2>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans max-w-2xl leading-relaxed">
            Nuking local data resets your platform completely. All pinned items, watch history logs, notifications read flags, reminder subscriptions, and genre preferences will be purged. This action is irreversible.
          </p>
          <div className="pt-2">
            <button
              onClick={handleClearAllData}
              className="flex items-center space-x-2 px-6 py-3 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 hover:border-red-500 text-red-500 rounded-none text-xs font-bold tracking-widest uppercase transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Nuke &amp; Reset All Local Data</span>
            </button>
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />

      {showAdultConfirm && (
        <AdultConfirmModal
          onConfirm={handleAdultConfirm}
          onCancel={() => setShowAdultConfirm(false)}
        />
      )}
    </div>
  );
}

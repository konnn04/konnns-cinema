'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { init as initSpatialNavigation, pause as pauseSpatialNavigation, resume as resumeSpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';

const TV_UA_PATTERN = /smart-tv|smarttv|hbbtv|appletv|googletv|android tv|aft[a-z]?\d*|tizen|webos|web0s|netcast|viera|bravia|philipstv|crkey|roku|dlnadoc|inettvbrowser/i;

function detectTVEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (TV_UA_PATTERN.test(navigator.userAgent)) return true;

  const noTouch = !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
  const coarseNoHover = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  return noTouch && coarseNoHover && window.innerWidth >= 960;
}

let spatialNavInitialized = false;

function ensureSpatialNavInitialized() {
  if (spatialNavInitialized || typeof window === 'undefined') return;
  // shouldFocusDOMNode: false -- with it on, a real <button>/<a> gets actual
  // browser focus, so pressing Enter fires the browser's own native
  // Enter-triggers-click behavior *in addition to* the manual ref.current
  // .click() every focusable does by default (see useTVFocusable.ts),
  // double-firing onClick (e.g. play/pause toggling itself right back off).
  // Visual focus (.tv-focus) is driven by norigin's own `focused` state
  // regardless, so nothing relies on real DOM focus being set.
  initSpatialNavigation({ shouldFocusDOMNode: false, shouldUseNativeEvents: true });
  spatialNavInitialized = true;
  pauseSpatialNavigation();
}

interface TVModeContextType {
  isTV: boolean;
}

const TVModeContext = createContext<TVModeContextType | undefined>(undefined);

export function TVModeProvider({ children }: { children: React.ReactNode }) {
  ensureSpatialNavInitialized();

  const tvModeOverride = usePreferencesStore((s) => s.tvModeOverride);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    const onChange = () => setDetected(detectTVEnvironment());
    const timer = setTimeout(onChange, 0);
    const mql = window.matchMedia('(hover: none) and (pointer: coarse)');
    mql.addEventListener('change', onChange);
    window.addEventListener('resize', onChange);
    return () => {
      clearTimeout(timer);
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  const isTV = tvModeOverride === 'on' ? true : tvModeOverride === 'off' ? false : detected;

  useEffect(() => {
    const root = document.documentElement;
    if (isTV) {
      root.setAttribute('data-tv-mode', 'true');
      resumeSpatialNavigation();
    } else {
      root.removeAttribute('data-tv-mode');
      pauseSpatialNavigation();
    }
  }, [isTV]);

  return <TVModeContext.Provider value={{ isTV }}>{children}</TVModeContext.Provider>;
}

export function useIsTV(): boolean {
  const ctx = useContext(TVModeContext);
  if (!ctx) throw new Error('useIsTV must be used within a TVModeProvider');
  return ctx.isTV;
}

const BACK_KEYS = new Set(['Backspace', 'Escape', 'GoBack', 'XF86Back', 'BrowserBack']);
const TIZEN_BACK_KEYCODE = 461;
const TIZEN_REMOTE_BACK_KEYCODE = 10009;

export function useTVBackKey(onBack: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      if (BACK_KEYS.has(e.key) || e.keyCode === TIZEN_BACK_KEYCODE || e.keyCode === TIZEN_REMOTE_BACK_KEYCODE) {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onBack]);
}

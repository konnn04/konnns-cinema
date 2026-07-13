'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ShieldAlert, Sparkles } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export function useTextScramble(targetText: string, duration = 1500, delay = 300) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let active = true;
    const chars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    
    const scramble = async () => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const steps = 25;
      const stepDuration = duration / steps;
      
      for (let step = 0; step <= steps; step++) {
        if (!active) return;
        const progress = step / steps;
        const result = targetText
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            const charProgress = index / targetText.length;
            if (progress >= charProgress) {
              return char;
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
        setDisplayText(result);
        await new Promise((resolve) => setTimeout(resolve, stepDuration));
      }
      setDisplayText(targetText);
    };
    
    scramble();
    return () => {
      active = false;
    };
  }, [targetText, duration, delay]);

  return displayText;
}

interface SplashIntroProps {
  onComplete: () => void;
}

export default function SplashIntro({ onComplete }: SplashIntroProps) {
  const { t, language } = useLanguage();
  const [visible, setVisible] = useState(true);
  const scrambledBrand = useTextScramble("Konnn's Cinema", 1800, 200);
  const [hasStarted, setHasStarted] = useState(false);
  
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const completed = localStorage.getItem('splash_completed');
        if (completed === 'true') {
          setVisible(false);
          onComplete();
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleStart = () => {
    if (requirePassword) {
      if (password === '1234') { 
        triggerExit();
      } else {
        setPasswordError('Invalid credentials. Please contact support.');
      }
      return;
    }
    triggerExit();
  };

  const triggerExit = () => {
    setHasStarted(true);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('splash_completed', 'true');
      }
      setVisible(false);
      onComplete();
    }, 800); 
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {!hasStarted && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
        >
          {}
          <div className="absolute inset-0 w-full h-full opacity-35 bg-cover bg-center mix-blend-color-dodge pointer-events-none"
               style={{ backgroundImage: "radial-gradient(circle at center, rgba(234, 88, 12, 0.15) 0%, rgba(6, 6, 8, 0.35) 70%)" }}>
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
              src="/bg1.mp4"
              onError={(e) => {
                (e.target as HTMLVideoElement).style.display = 'none';
              }}
            />
          </div>

          {}
          <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-transparent to-cinema-bg pointer-events-none" />

          {}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-lg px-6 text-center">
            {}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="mb-8 relative p-8"
            >
              <span className="font-sans text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-2 block">
                {t('splash.welcome')}
              </span>

              <h1 className="font-outfit font-extrabold tracking-widest text-4xl sm:text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-brand-orange select-none glow-text">
                {scrambledBrand || "Konnn's Cinema"}
              </h1>

              <p className="mt-3 font-sans text-xs uppercase tracking-[0.3em] text-[#E2B646] font-medium">
                {t('splash.subtitle')}
              </p>
            </motion.div>

            {}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-zinc-400 font-sans text-sm tracking-wider max-w-sm mb-12"
            >
              {t('splash.description')}
            </motion.p>

            {}
            {requirePassword && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="w-full mb-6 max-w-xs space-y-2"
              >
                <div className="flex items-center space-x-2 text-xs text-brand-orange/80 mb-2 justify-center">
                  <ShieldAlert size={14} />
                  <span>Access Authentication Required</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Enter Access PIN..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 text-zinc-100 text-center text-sm focus:outline-none focus:border-brand-orange transition-all font-mono tracking-widest"
                />
                {passwordError && (
                  <p className="text-[10px] text-brand-red font-sans">{passwordError}</p>
                )}
              </motion.div>
            )}

            {}
            <motion.button
              onClick={handleStart}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="group relative flex items-center justify-center space-x-3 px-8 py-4 bg-gradient-to-r from-brand-red to-[#E2B646] rounded-none text-black font-outfit text-sm font-black tracking-wider uppercase shadow-xl hover:shadow-[#E2B646]/20 hover:glow-red-orange transition-all cursor-pointer"
            >
              <Sparkles size={16} className="text-black animate-pulse" />
              <span>{t('splash.start_button')}</span>
              <Play size={14} className="fill-current text-black transition-transform group-hover:translate-x-1" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

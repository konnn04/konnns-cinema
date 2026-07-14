'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Delete } from 'lucide-react';

const MAX_CODE_LENGTH = 20;
const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

function formatSeconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}

export default function AccessCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [wrongFlash, setWrongFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const remainingLockSeconds = formatSeconds(lockedUntil - now);
  const isLocked = remainingLockSeconds > 0;

  useEffect(() => {
    fetch('/api/site-auth')
      .then((res) => res.json())
      .then((data) => { if (data.locked) setLockedUntil(data.lockedUntil); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLocked) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isLocked]);

  const appendDigit = (digit: string) => {
    if (isLocked || submitting) return;
    setWrongFlash(false);
    setCode((prev) => (prev.length < MAX_CODE_LENGTH ? prev + digit : prev));
  };

  const backspace = () => {
    if (isLocked || submitting) return;
    setCode((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (isLocked || submitting || !code) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/site-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push('/');
        router.refresh();
        return;
      }
      if (data.locked) {
        setLockedUntil(data.lockedUntil);
        setNow(Date.now());
      } else {
        setWrongFlash(true);
      }
      setCode('');
    } catch {
      setWrongFlash(true);
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full border border-zinc-800 flex items-center justify-center">
          <Lock className="w-6 h-6 text-zinc-400" />
        </div>

        <div className="space-y-1">
          <p className="text-sm text-zinc-300">Nhập mã bảo mật</p>
          <p className="text-sm text-zinc-500">Enter security code</p>
        </div>

        <input
          ref={inputRef}
          value={code}
          onChange={(e) => { if (!isLocked && !submitting) setCode(e.target.value.replace(/\D/g, '').slice(0, MAX_CODE_LENGTH)); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          inputMode="numeric"
          autoFocus
          className="sr-only"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="w-full min-h-12 flex items-center justify-center flex-wrap gap-2 px-4 py-3 border border-zinc-800 cursor-text"
        >
          {code.length === 0 && <span className="text-zinc-700 text-xs">•</span>}
          {Array.from({ length: code.length }).map((_, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full bg-[#E2B646]" />
          ))}
        </button>

        {isLocked ? (
          <div className="space-y-0.5">
            <p className="text-xs text-red-500">Thử lại sau {remainingLockSeconds}s</p>
            <p className="text-xs text-red-500/70">Try again in {remainingLockSeconds}s</p>
          </div>
        ) : wrongFlash ? (
          <div className="space-y-0.5">
            <p className="text-xs text-red-500">Mã không đúng</p>
            <p className="text-xs text-red-500/70">Incorrect code</p>
          </div>
        ) : (
          <div className="h-8" />
        )}

        <div className="grid grid-cols-3 gap-2">
          {KEYPAD_ROWS.flat().map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLocked || submitting}
              onClick={() => appendDigit(digit)}
              className="py-3 border border-zinc-800 text-zinc-200 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-mono cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isLocked || submitting || !code}
            onClick={() => setCode('')}
            className="py-3 border border-zinc-800 text-zinc-500 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] uppercase cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isLocked || submitting}
            onClick={() => appendDigit('0')}
            className="py-3 border border-zinc-800 text-zinc-200 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-mono cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            disabled={isLocked || submitting || !code}
            onClick={backspace}
            className="py-3 border border-zinc-800 text-zinc-500 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
          >
            <Delete size={16} />
          </button>
        </div>

        <button
          type="button"
          disabled={isLocked || submitting || !code}
          onClick={handleSubmit}
          className="w-full py-3 bg-[#E2B646] hover:bg-[#E2B646]/90 disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          Xác nhận / Confirm
        </button>
      </div>
    </div>
  );
}

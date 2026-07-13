'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
      className="flex items-center space-x-1 text-zinc-400 hover:text-[#E2B646] transition-colors cursor-pointer"
      title="Switch language / Chuyển ngôn ngữ"
    >
      <Languages size={16} />
      <span className="text-[10px] font-mono font-bold uppercase">{language}</span>
    </button>
  );
}

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'vi' | 'en';

import viTranslations from '@/lib/locales/vi.json';
import enTranslations from '@/lib/locales/en.json';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  vi: viTranslations,
  en: enTranslations,
};

const GENRE_MAP: { [key: string]: string } = {
  'Hành Động': 'Action',
  'Hành động': 'Action',
  'Cổ Trang': 'Historical',
  'Viễn Tưởng': 'Sci-Fi',
  'Kinh Dị': 'Horror',
  'Kinh dị': 'Horror',
  'Tình Cảm': 'Romance',
  'Tình cảm': 'Romance',
  'Tâm Lý': 'Drama',
  'Tâm lý': 'Drama',
  'Hài Hước': 'Comedy',
  'Hài hước': 'Comedy',
  'Hình Sự': 'Crime',
  'Hình sự': 'Crime',
  'Võ Thuật': 'Martial Arts',
  'Võ thuật': 'Martial Arts',
  'Thần Thoại': 'Mythology',
  'Phiêu Lưu': 'Adventure',
  'Phiêu lưu': 'Adventure',
  'Tài Liệu': 'Documentary',
  'Tài liệu': 'Documentary',
  'Chiến Tranh': 'War',
  'Chiến tranh': 'War',
  'Âm Nhạc': 'Music',
  'Âm nhạc': 'Music',
  'Bí Ẩn': 'Mystery',
  'Bí ẩn': 'Mystery',
  'Khoa Học': 'Science',
  'Khoa học': 'Science',
  'Thể Thao': 'Sports',
  'Thể thao': 'Sports',
  'Gia Đình': 'Family',
  'Gia đình': 'Family',
  'Chính Kịch': 'Drama',
  'Chính kịch': 'Drama',
  'Học Đường': 'School',
  'Học đường': 'School',
  'Hoạt Hình': 'Anime/Animation',
  'Hoạt hình': 'Anime/Animation',
  'Kịch tính': 'Thriller',
  'Kịch Tính': 'Thriller',
  'Tập mới nhất': 'Latest EP',
  'Hoàn thành': 'Completed',
  'Đang chiếu': 'Airing',
  'Sắp ra mắt': 'Coming Soon',
};

const COUNTRY_MAP: { [key: string]: string } = {
  'Trung Quốc': 'China',
  'Hàn Quốc': 'South Korea',
  'Nhật Bản': 'Japan',
  'Âu Mỹ': 'US/Europe',
  'Việt Nam': 'Vietnam',
  'Thái Lan': 'Thailand',
  'Ấn Độ': 'India',
  'Hồng Kông': 'Hong Kong',
  'Đài Loan': 'Taiwan',
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  translateGenre: (genre: string) => string;
  translateCountry: (country: string) => string;
  translateMovieTitle: (movie: { name: string; origin_name?: string }) => string;
  translateStatus: (statusStr: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('app_language') as Language;
      Promise.resolve().then(() => {
        if (savedLang === 'vi' || savedLang === 'en') {
          setLanguageState(savedLang);
        } else {
          setLanguageState('vi');
        }
      });
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang);
    }
  };

  const t = (key: string, replacements?: { [key: string]: string | number }): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.vi;
    let val = dict[key] || TRANSLATIONS.vi[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v));
      });
    }
    return val;
  };

  const translateGenre = (genre: string): string => {
    if (language === 'vi') return genre;
    return GENRE_MAP[genre] || genre;
  };

  const translateCountry = (country: string): string => {
    if (language === 'vi') return country;
    return COUNTRY_MAP[country] || country;
  };

  const translateMovieTitle = (movie: { name: string; origin_name?: string }): string => {
    if (language === 'vi') return movie.name;
    return movie.origin_name || movie.name;
  };

  const translateStatus = (statusStr: string): string => {
    if (language === 'vi') return statusStr;
    const trimmed = statusStr.trim();
    if (GENRE_MAP[trimmed]) return GENRE_MAP[trimmed];
    
    if (trimmed.toLowerCase().startsWith('tập')) {
      return trimmed.replace(/tập/i, 'Ep');
    }
    return trimmed;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateGenre,
        translateCountry,
        translateMovieTitle,
        translateStatus,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

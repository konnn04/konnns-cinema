'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'vi' | 'en';

interface TranslationDictionary {
  [key: string]: {
    vi: string;
    en: string;
  };
}

const DICTIONARY: TranslationDictionary = {
  // Common
  'common.loading': { vi: 'Đang tải...', en: 'Loading...' },
  'common.not_available': { vi: 'Chưa có', en: 'N/A' },
  'common.no_alerts': { vi: 'Không có thông báo hôm nay', en: 'No alerts today' },
  'common.notifications': { vi: 'Thông báo', en: 'Notifications' },
  'common.clear_unread': { vi: 'Đánh dấu đã đọc', en: 'Clear Unread' },
  'common.continue': { vi: 'Tiếp tục', en: 'Continue' },
  'common.view_all_results': { vi: 'Xem tất cả kết quả', en: 'View All Results' },

  // Navigation / Header
  'nav.home': { vi: 'Trang Chủ', en: 'Home' },
  'nav.search': { vi: 'Tìm Kiếm', en: 'Search' },
  'nav.favorites': { vi: 'Yêu Thích', en: 'Favorites' },
  'nav.history': { vi: 'Lịch Sử', en: 'History' },
  'nav.settings': { vi: 'Cài Đặt', en: 'Settings' },
  'nav.genres': { vi: 'Thể loại', en: 'Genres' },
  'nav.countries': { vi: 'Quốc gia', en: 'Countries' },
  'nav.movies': { vi: 'Phim lẻ', en: 'Movies' },
  'nav.series': { vi: 'Phim bộ', en: 'Series' },
  'search.placeholder': { vi: 'Tìm phim, đạo diễn, diễn viên...', en: 'Search movies, directors, cast...' },
  'search.recent': { vi: 'Tìm kiếm gần đây', en: 'Recent Searches' },
  'search.suggestions': { vi: 'Gợi ý kết quả', en: 'Suggested Results' },
  'search.no_suggestions': { vi: 'Không có gợi ý phù hợp', en: 'No suggestions found' },
  'notif.welcome_title': { vi: "Chào mừng tới Konnn's Cinema", en: "Welcome to Konnn's Cinema" },
  'notif.welcome_desc': { vi: "Trải nghiệm rạp chiếu phim chất lượng cao hỗ trợ bởi KKPhim.", en: "Experience high-definition cinema streaming powered by KKPhim." },
  'notif.favorites_title': { vi: 'Đang theo dõi mục yêu thích', en: 'Tracking favorites' },
  'notif.favorites_desc': { vi: 'Bạn đã ghim {count} phim. Truy cập trực tiếp tại bảng yêu thích.', en: 'You pinned {count} movies. Access them directly on your favorites board.' },
  'notif.history_title': { vi: 'Tiếp tục xem?', en: 'Continue watching?' },
  'notif.history_desc': { vi: 'Xem tiếp bộ phim "{name}" ngay tại phân đoạn bạn đã dừng.', en: 'Resume watching "{name}" right where you left off.' },
  'notif.time_just_now': { vi: 'Vừa xong', en: 'Just now' },
  'notif.time_hours_ago': { vi: '1 giờ trước', en: '1h ago' },
  'notif.time_recently': { vi: 'Gần đây', en: 'Recently' },

  // Onboarding & Splash
  'splash.welcome': { vi: 'XIN CHÀO', en: 'WELCOME TO' },
  'splash.subtitle': { vi: 'HỆ THỐNG TRUYỀN TẢI ĐIỆN ẢNH CHẤT LƯỢNG CAO', en: 'ULTIMATE HIGH-DEFINITION STREAMING ENGINE' },
  'splash.loading': { vi: 'Đang khởi chạy hệ thống...', en: 'Initializing system core...' },
  'onboard.title': { vi: 'Chào Mừng Đến Với Konnn\'s Cinema', en: 'Welcome to Konnn\'s Cinema' },
  'onboard.subtitle': { vi: 'Bắt đầu hành trình điện ảnh của bạn với 3 bước đơn giản', en: 'Begin your cinematic journey in 3 simple steps' },
  'onboard.step1_title': { vi: 'Truyền Tải Chất Lượng Cao', en: 'High Definition Streaming' },
  'onboard.step1_desc': { vi: 'Tất cả các phim đều được truyền tải với chất lượng HD/FullHD cùng tốc độ tải cực nhanh.', en: 'All movies are streamed in HD/FullHD quality with super-fast loading times.' },
  'onboard.step2_title': { vi: 'Ghim Phim Yêu Thích', en: 'Pin & Save Favorites' },
  'onboard.step2_desc': { vi: 'Lưu giữ những bộ phim bạn muốn xem vào bảng mục yêu thích cá nhân chỉ với 1 lượt chạm.', en: 'Store movies you wish to watch in your personal favorites board with a single tap.' },
  'onboard.step3_title': { vi: 'Tiến Trình Xem Tiện Lợi', en: 'Auto Watch History' },
  'onboard.step3_desc': { vi: 'Tự động sao lưu tiến trình phát sóng để bạn có thể tiếp tục xem bất cứ lúc nào.', en: 'Automatically back up playback progress so you can resume at any time.' },
  'onboard.next': { vi: 'Tiếp tục', en: 'Next' },
  'onboard.back': { vi: 'Quay lại', en: 'Back' },
  'onboard.get_started': { vi: 'Bắt đầu trải nghiệm', en: 'Get Started' },

  // Home Page
  'home.trending': { vi: 'XU HƯỚNG NỔI BẬT', en: 'TRENDING TITLES' },
  'home.recently_updated': { vi: 'MỚI CẬP NHẬT', en: 'RECENTLY UPDATED' },
  'home.favorites_row': { vi: 'MỤC BẠN ĐÃ GHIM', en: 'YOUR PINNED MOVIES' },
  'home.history_row': { vi: 'TIẾP TỤC THEO DÕI', en: 'CONTINUE WATCHING' },
  'home.view_all': { vi: 'Xem tất cả', en: 'View all' },
  'home.no_favorites': { vi: 'Chưa có phim nào được ghim. Nhấn nút trái tim trên phim để ghim tại đây.', en: 'No movies pinned yet. Tap the heart icon on any movie to show it here.' },
  'home.no_history': { vi: 'Lịch sử trống. Hãy bắt đầu xem phim để theo dõi tại đây.', en: 'Watch history is empty. Start streaming a title to track it here.' },

  // Filters / Search Page
  'filter.title': { vi: 'BỘ LỌC TÌM KIẾM PHIM', en: 'FILTER ENGINE DECK' },
  'filter.genre': { vi: 'Tất cả Thể loại', en: 'All Genres' },
  'filter.country': { vi: 'Tất cả Quốc gia', en: 'All Countries' },
  'filter.year': { vi: 'Tất cả Năm', en: 'All Years' },
  'filter.sort_recently': { vi: 'Mới cập nhật', en: 'Recently Updated' },
  'filter.sort_year': { vi: 'Năm phát hành', en: 'Release Year' },
  'filter.apply': { vi: 'Áp dụng', en: 'Apply' },
  'filter.reset': { vi: 'Đặt lại bộ lọc', en: 'Reset Filters' },
  'search.results_for': { vi: 'Kết quả tìm kiếm cho', en: 'Search results for' },
  'search.catalog': { vi: 'Tất cả danh mục phim', en: 'Full Movie Catalog' },
  'search.syncing': { vi: 'Đang tải thêm phim...', en: 'Syncing catalog...' },
  'search.load_more': { vi: 'Tải thêm phim', en: 'Load More Movies' },
  'search.no_match': { vi: 'Không Tìm Thấy Phim Phù Hợp', en: 'No Titles Matched' },
  'search.no_match_desc': { vi: 'Hãy điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn.', en: 'Try adjusting your filters or search keywords.' },
  'search.error_title': { vi: 'Lỗi Tải Danh Sách Phim', en: 'Grid Fetch Failed' },

  // Movie Details Modal
  'movie.details': { vi: 'Chi Tiết Phim', en: 'Movie Details' },
  'movie.watch_now': { vi: 'Xem Phim', en: 'Watch Now' },
  'movie.pin': { vi: 'Ghim Phim', en: 'Pin Movie' },
  'movie.pinned': { vi: 'Đã Ghim', en: 'Pinned' },
  'movie.year': { vi: 'Năm', en: 'Year' },
  'movie.quality': { vi: 'Chất lượng', en: 'Quality' },
  'movie.genres': { vi: 'Thể loại', en: 'Genres' },
  'movie.country': { vi: 'Quốc gia', en: 'Country' },
  'movie.status': { vi: 'Trạng thái', en: 'Status' },
  'movie.director': { vi: 'Đạo diễn', en: 'Director' },
  'movie.actors': { vi: 'Diễn viên', en: 'Cast' },
  'movie.episodes': { vi: 'Danh sách tập', en: 'Episodes' },
  'movie.trailer': { vi: 'Xem Trailer', en: 'Watch Trailer' },
  'movie.no_description': { vi: 'Không có mô tả chi tiết cho phim này.', en: 'No detailed description available for this title.' },
  'movie.synopsis': { vi: 'Nội dung phim', en: 'Synopsis' },
  'movie.syncing_synopsis': { vi: 'Đang tải nội dung phim...', en: 'Syncing movie synopsis...' },
  'movie.status_completed': { vi: 'Hoàn thành', en: 'Completed' },
  'movie.status_airing': { vi: 'Đang chiếu', en: 'Airing' },
  'movie.status_coming': { vi: 'Sắp ra mắt', en: 'Coming Soon' },

  // Favorites / History Pages
  'fav.title': { vi: 'Danh Sách Ghim', en: 'Pinned Favorites' },
  'fav.back': { vi: 'Quay lại', en: 'Back Home' },
  'fav.empty': { vi: 'Danh Sách Trống', en: 'Your Board is Empty' },
  'fav.empty_desc': { vi: 'Hãy nhấn biểu tượng trái tim trên các thẻ phim để lưu vào đây.', en: 'Tap the heart icon on any movie card to save titles here.' },
  'fav.explore': { vi: 'Khám phá danh mục', en: 'Explore Catalog' },
  'history.title': { vi: 'Phim Đang Xem', en: 'Continue Watching' },
  'history.clear_all': { vi: 'Xóa toàn bộ', en: 'Clear All' },
  'history.empty': { vi: 'Lịch Sử Xem Trống', en: 'No Watch History Captured' },
  'history.empty_desc': { vi: 'Những bộ phim bạn đang xem dở sẽ hiển thị ở đây để xem tiếp dễ dàng.', en: 'Streaming sessions you begin will show here for easy continuation.' },

  // Settings Page
  'settings.title': { vi: 'Tùy Chọn & Cài Đặt', en: 'Preferences & Settings' },
  'settings.player_defaults': { vi: 'Cấu hình trình phát mặc định', en: 'Player Defaults Preset' },
  'settings.auto_advance': { vi: 'Tự động chuyển tập', en: 'Episode Auto-Advance' },
  'settings.auto_advance_desc': { vi: 'Tự động chuyển sang tập kế tiếp khi tập hiện tại kết thúc', en: 'Automatically advances to next episode on finish' },
  'settings.image_enhancer': { vi: 'Bộ lọc làm nét hình ảnh', en: 'Image Enhancer Overlay' },
  'settings.image_enhancer_desc': { vi: 'Áp dụng bộ lọc phủ làm nét hình ảnh trong trình phát video', en: 'Applies sharpening visual filter boost inside player' },
  'settings.playback_speed': { vi: 'Tốc độ phát mặc định', en: 'Playback Speed defaults' },
  'settings.playback_speed_desc': { vi: 'Đặt hệ số tốc độ khởi điểm cho các phiên phát video', en: 'Sets active multiplier speed for beginning sessions' },
  'settings.home_sorting': { vi: 'Tùy chỉnh phân mục Trang Chủ', en: 'Customize Home Row Sorting' },
  'settings.home_sorting_desc': { vi: 'Chọn thể loại phim bạn muốn hiển thị ưu tiên tại Trang Chủ', en: 'Select which genres you want prioritized on your Home layout rows' },
  'settings.syncing_categories': { vi: 'Đang đồng bộ phân mục...', en: 'Syncing categories...' },
  'settings.danger_zone': { vi: 'Vùng Nguy Hiểm', en: 'Danger Zone' },
  'settings.nuke': { vi: 'Xóa toàn bộ dữ liệu cục bộ', en: 'Nuke & Reset All Local Data' },
  'settings.nuke_warning': { vi: 'Hành động này sẽ xóa sạch danh sách yêu thích, lịch sử xem và cài đặt của bạn.', en: 'This action will clear all favorites, watch logs, and reset settings.' },
  'settings.language_label': { vi: 'Ngôn ngữ ứng dụng', en: 'Application Language' },
  'settings.language_desc': { vi: 'Chuyển đổi ngôn ngữ hiển thị trên toàn hệ thống', en: 'Switch display language system-wide' },

  // Watch Page
  'watch.servers': { vi: 'DANH SÁCH MÁY CHỦ', en: 'STREAM SERVERS' },
  'watch.server_badge': { vi: 'Nguồn', en: 'Source' },
  'watch.recommended': { vi: 'Đề xuất', en: 'Recommended' },
  'watch.error_stream': { vi: 'Không tải được luồng phát. Thử chuyển đổi máy chủ phát sóng phía dưới.', en: 'Failed to load video stream. Try switching stream servers below.' },
  'watch.playing_ep': { vi: 'Đang phát tập', en: 'Now playing Ep' },
  'watch.episodes_list': { vi: 'DANH SÁCH CÁC TẬP', en: 'EPISODE SELECTIONS' },
  'watch.ep_title': { vi: 'Tập {name}', en: 'Episode {name}' },
  'watch.cinema_mode': { vi: 'Chế độ rạp chiếu', en: 'Cinema Theater Mode' },
  'watch.light_off': { vi: 'Tắt đèn xung quanh rạp để có trải nghiệm xem tập trung tốt nhất.', en: 'Dims surrounding layout ambient lights for focused viewing.' },
  'watch.player_controls_title': { vi: 'LỐI TẮT BÀN PHÍM', en: 'KEYBOARD HOTKEYS' },
  'watch.player_control_play': { vi: 'Dấu cách (Space) để Phát/Dừng phim', en: 'Spacebar to Play / Pause playback' },
  'watch.player_control_mute': { vi: 'Phím M để Bật/Tắt âm thanh', en: 'Key M to Toggle mute audio volume' },
  'watch.player_control_fs': { vi: 'Phím F để Bật/Thoát toàn màn hình', en: 'Key F to Enter / Exit full-screen' },
};

// Map popular Vietnamese genres to English
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

// Map popular Vietnamese countries to English
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
          // Default to Vietnamese if system language is Vietnamese, otherwise default to Vietnamese as requested
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
    const entry = DICTIONARY[key];
    if (!entry) {
      return key;
    }
    let val = entry[language] || entry['vi'] || key;
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
    
    // Check if it's something like "Tập 12" -> "Ep 12"
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

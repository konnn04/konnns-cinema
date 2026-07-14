export interface NavLinkItem {
  name: string;
  slug: string;
  href?: string;
}

export const GENRES: NavLinkItem[] = [
  { name: 'Anime', slug: 'hoat-hinh', href: '/type/hoat-hinh' },
  { name: 'Hành động', slug: 'hanh-dong' },
  { name: 'Cổ trang', slug: 'co-trang' },
  { name: 'Chiến tranh', slug: 'chien-tranh' },
  { name: 'Viễn tưởng', slug: 'vien-tuong' },
  { name: 'Kinh dị', slug: 'kinh-di' },
  { name: 'Hài hước', slug: 'hai-huoc' },
  { name: 'Tình cảm', slug: 'tinh-cam' },
  { name: 'Võ thuật', slug: 'vo-thuat' },
  { name: 'Phiêu lưu', slug: 'phieu-luu' },
  { name: 'Tâm lý', slug: 'tam-ly' },
  { name: 'Tài liệu', slug: 'tai-lieu' },
  { name: 'Hình sự', slug: 'hinh-su' },
];

export const COUNTRIES: NavLinkItem[] = [
  { name: 'Trung Quốc', slug: 'trung-quoc' },
  { name: 'Hàn Quốc', slug: 'han-quoc' },
  { name: 'Âu Mỹ', slug: 'au-my' },
  { name: 'Nhật Bản', slug: 'nhat-ban' },
  { name: 'Thái Lan', slug: 'thai-lan' },
  { name: 'Hồng Kông', slug: 'hong-kong' },
  { name: 'Ấn Độ', slug: 'an-do' },
];

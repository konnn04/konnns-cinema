import type { Metadata } from 'next';
import AccessCodeForm from '@/components/access/AccessCodeForm';

export const metadata: Metadata = {
  title: { absolute: '🔑 Access' },
  description: 'Nhập mã bảo mật để truy cập / Enter security code to access',
  robots: { index: false, follow: false },
};

export default function AccessPage() {
  return <AccessCodeForm />;
}

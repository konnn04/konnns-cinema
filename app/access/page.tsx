import type { Metadata } from 'next';
import AccessCodeForm from '@/components/access/AccessCodeForm';

export const metadata: Metadata = {
  title: { absolute: 'Access' },
  description: 'Access',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Access',
    description: 'Access',
    siteName: 'Access',
    images: [],
  },
};

export default function AccessPage() {
  return <AccessCodeForm />;
}

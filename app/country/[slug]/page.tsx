import { redirect } from 'next/navigation';

export default async function CountryRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/search?country=${slug}`);
}

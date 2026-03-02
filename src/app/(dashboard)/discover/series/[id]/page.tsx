import { redirect } from 'next/navigation';

export default async function DiscoverSeriesRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/series/${id}`);
}

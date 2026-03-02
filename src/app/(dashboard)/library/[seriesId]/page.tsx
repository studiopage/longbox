import { redirect } from 'next/navigation';

export default async function LibrarySeriesRedirect({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  redirect(`/series/${seriesId}`);
}

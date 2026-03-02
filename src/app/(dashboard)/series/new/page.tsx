import { redirect } from 'next/navigation';

export default async function NewSeriesRedirect({ searchParams }: { searchParams: Promise<{ cvId?: string }> }) {
  const { cvId } = await searchParams;
  if (!cvId) redirect('/');
  redirect(`/series/${cvId}`);
}

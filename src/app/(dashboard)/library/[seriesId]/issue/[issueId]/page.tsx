import { redirect } from 'next/navigation';

export default async function LibraryIssueRedirect({ params }: { params: Promise<{ seriesId: string; issueId: string }> }) {
  const { seriesId, issueId } = await params;
  redirect(`/series/${seriesId}/issue/${issueId}`);
}

export const dynamic = 'force-dynamic';

import { unifiedSearch } from '@/lib/search-service';
import { redirect } from 'next/navigation';
import { SearchClient } from './search-client';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: query } = await searchParams;

  if (!query) {
    redirect('/');
  }

  // Use unified search service with issue counts for advanced search
  const { localResults, remoteResults } = await unifiedSearch(query, {
    includeIssueCount: true, // Include issue counts for filtering
    remoteLimit: 50, // Get more remote results for comprehensive search
  });

  // Get unique publishers for filter
  const allPublishers = [
    ...new Set([
      ...localResults.map(r => r.publisher).filter(Boolean),
      ...remoteResults.map(r => r.publisher).filter(Boolean),
    ])
  ].sort();

  return (
    <main className="p-8 space-y-6">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
        <p className="text-muted-foreground">
          Showing results for <span className="text-primary font-bold">"{query}"</span>
        </p>
      </div>

      <SearchClient
        query={query}
        localResults={localResults as any}
        remoteResults={remoteResults}
        publishers={allPublishers as string[]}
      />
    </main>
  );
}

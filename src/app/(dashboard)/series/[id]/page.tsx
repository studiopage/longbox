export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { series, issues } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, HardDrive, CheckCircle2, DownloadCloud, Eye } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { RequestButton } from '@/components/longbox/request-button';
import { SyncIssuesButton } from '@/components/longbox/sync-issues-button';
import { RequestAllButton } from '@/components/longbox/request-all-button';

export default async function LocalSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch series and issues using direct queries (more reliable than relational API)
  const [seriesData] = await db.select({
    id: series.id,
    name: series.name,
    publisher: series.publisher,
    year: series.year,
    description: series.description,
    status: series.status,
    thumbnail_url: series.thumbnail_url,
    cv_id: series.cv_id,
    created_at: series.created_at,
    updated_at: series.updated_at,
  }).from(series).where(eq(series.id, id)).limit(1);
  
  if (!seriesData) {
    return <div className="p-10">Series not found in library.</div>;
  }

  // Fetch issues for this series
  const issuesData = await db.select({
    id: issues.id,
    series_id: issues.series_id,
    cv_id: issues.cv_id,
    issue_number: issues.issue_number,
    title: issues.title,
    cover_date: issues.cover_date,
    thumbnail_url: issues.thumbnail_url,
    status: issues.status,
    read: issues.read,
    created_at: issues.created_at,
  })
    .from(issues)
    .where(eq(issues.series_id, id))
    .orderBy(asc(issues.cover_date));

  const localSeries = { ...seriesData, issues: issuesData };

  return (
    <div className="min-h-screen pb-20">
      
      {/* HERO SECTION (Same as Import Page, but using local data) */}
      <div className="relative w-full h-[40vh] bg-muted overflow-hidden">
        {localSeries.thumbnail_url && (
            <div 
                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 scale-110"
                style={{ backgroundImage: `url(${localSeries.thumbnail_url})` }}
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-8 flex gap-6 items-end max-w-5xl">
             <div className="w-32 md:w-48 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border-2 border-background/20 hidden md:block">
                {localSeries.thumbnail_url && <img src={localSeries.thumbnail_url} className="w-full h-full object-cover" />}
             </div>

             <div className="space-y-2 mb-2">
                <Link href="/">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-3 mb-2">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Library
                    </Button>
                </Link>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white shadow-black drop-shadow-md">
                    {localSeries.name}
                </h1>
                <div className="flex items-center gap-3 text-white/80">
                    <Badge className="bg-primary text-primary-foreground border-none">
                        IN LIBRARY
                    </Badge>
                    <span className="font-bold">{localSeries.publisher}</span>
                    <span className="flex items-center text-sm font-medium">
                        <Calendar className="w-4 h-4 mr-1.5 opacity-70" /> {localSeries.year}
                    </span>
                    <span className="text-sm opacity-60">•</span>
                    <span className="text-sm font-medium">{localSeries.issues?.length || 0} Issues</span>
                </div>
             </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 z-20 px-8 py-3 flex items-center justify-between">
         <div className="flex items-center gap-4">
             <div className="text-sm text-muted-foreground flex items-center">
                <HardDrive className="w-4 h-4 mr-2 text-green-500" />
                Local Metadata Active
             </div>
         </div>
         <div className="flex gap-2">
            <SyncIssuesButton seriesId={localSeries.id} cvId={localSeries.comicvine_id} />
         </div>
      </div>

      {/* CONTENT GRID */}
      <main className="p-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
         
         {/* Left: Issues List */}
         <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Issue Management</h3>
                <span className="text-xs text-muted-foreground">
                    {localSeries.issues?.filter((i: any) => i.status === 'downloaded').length || 0} / {localSeries.issues?.length || 0} Owned
                </span>
            </div>

            {localSeries.issues && localSeries.issues.length > 0 ? (
              <div className="space-y-2">
                {localSeries.issues.map((issue: any) => (
                    <div key={issue.id} className="group flex items-center p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                            {/* Status Indicator */}
                            <div className="mr-4 flex flex-col items-center gap-1">
                                {/* Download Status */}
                                {issue.status === 'downloaded' ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : issue.status === 'wanted' ? (
                                    <DownloadCloud className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-muted" />
                                )}

                                {/* Read Status (Small Eye Icon) */}
                                {issue.read && (
                                    <div title="Read" className="bg-primary/10 text-primary rounded-full p-0.5">
                                        <Eye className="w-3 h-3" />
                                    </div>
                                )}
                            </div>

                            <div className="w-10 h-14 bg-muted rounded overflow-hidden mr-4 shrink-0">
                                {issue.thumbnail_url && <img src={issue.thumbnail_url} className="w-full h-full object-cover" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm truncate">{issue.title}</h4>
                                    <Badge variant="outline" className="text-[10px] h-5 px-1">
                                        #{issue.issue_number}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{issue.cover_date}</p>
                            </div>

                            {/* Individual Request Button */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <RequestButton 
                                    issueId={issue.id} 
                                    currentStatus={issue.status || 'missing'} 
                                />
                            </div>
                    </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground bg-accent/10 rounded-lg border border-dashed">
                <p>No issues found. Click &quot;Sync Metadata&quot; to fetch issues from ComicVine.</p>
              </div>
            )}
         </div>

         {/* Right: Series Actions */}
         <div className="space-y-6">
            <div className="p-6 rounded-lg border bg-muted/20 space-y-4">
                <h4 className="font-bold text-sm">Acquisition Control</h4>
                <p className="text-xs text-muted-foreground">
                    Requesting issues will add them to the Kapowarr download queue.
                </p>
                <RequestAllButton seriesId={localSeries.id} />
            </div>
            
            <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-bold text-sm mb-2">Synopsis</h3>
                <div 
                    className="text-xs text-muted-foreground leading-relaxed prose prose-invert max-w-none line-clamp-[10]"
                    dangerouslySetInnerHTML={{ __html: localSeries.description || 'No description available.' }} 
                />
            </div>
         </div>
      </main>
    </div>
  );
}

import { getComicVineVolume, getComicVineIssues } from '@/lib/comicvine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ImportButton } from '@/components/longbox/import-button';

export default async function NewSeriesPage({ searchParams }: { searchParams: Promise<{ cvId?: string }> }) {
  const { cvId } = await searchParams;
  if (!cvId) redirect('/');

  // Parallel Data Fetch
  const [volume, issues] = await Promise.all([
    getComicVineVolume(cvId),
    getComicVineIssues(cvId)
  ]);

  if (!volume) {
    return <div className="p-8">Series not found. Check API Key.</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      
      {/* HERO SECTION */}
      <div className="relative w-full h-[40vh] bg-muted overflow-hidden">
        {/* Blurry Background */}
        {volume.image?.medium_url && (
            <div 
                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 scale-110"
                style={{ backgroundImage: `url(${volume.image.medium_url})` }}
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-8 flex gap-6 items-end max-w-5xl">
             {/* Cover Image */}
             <div className="w-32 md:w-48 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border-2 border-background/20 hidden md:block">
                {volume.image?.medium_url && <img src={volume.image.medium_url} className="w-full h-full object-cover" />}
             </div>

             {/* Metadata */}
             <div className="space-y-2 mb-2">
                <Link href="/discovery">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-3 mb-2">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Discovery
                    </Button>
                </Link>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white shadow-black drop-shadow-md">
                    {volume.name}
                </h1>
                <div className="flex items-center gap-3 text-white/80">
                    <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
                        {volume.publisher?.name || 'Unknown Publisher'}
                    </Badge>
                    <span className="flex items-center text-sm font-medium">
                        <Calendar className="w-4 h-4 mr-1.5 opacity-70" /> {volume.start_year}
                    </span>
                    <span className="text-sm opacity-60">•</span>
                    <span className="text-sm font-medium">{volume.count_of_issues} Issues</span>
                </div>
             </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 z-20 px-8 py-3 flex items-center justify-between">
         <div className="text-sm text-muted-foreground">
            This series is <strong>not in your library</strong>.
         </div>
         
         {/* THE NEW BUTTON */}
         <ImportButton cvId={cvId} /> 
         
      </div>

      {/* CONTENT GRID */}
      <main className="p-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
         
         {/* Left: Description */}
         <div className="md:col-span-2 space-y-6">
            <section>
                <h3 className="text-lg font-bold mb-2">Synopsis</h3>
                <div 
                    className="text-muted-foreground leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: volume.description || 'No description available.' }} 
                />
            </section>

            <section>
                <h3 className="text-lg font-bold mb-4">Issue List ({issues.length})</h3>
                <div className="space-y-2">
                    {issues.map((issue: any) => (
                        <div key={issue.id} className="flex items-center p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                             <div className="w-10 h-14 bg-muted rounded overflow-hidden mr-4 shrink-0">
                                {issue.image?.medium_url && <img src={issue.image.medium_url} className="w-full h-full object-cover" />}
                             </div>
                             <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">Issue #{issue.issue_number}</h4>
                                    <span className="text-xs text-muted-foreground">{issue.cover_date}</span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{issue.name}</p>
                             </div>
                        </div>
                    ))}
                </div>
            </section>
         </div>

         {/* Right: Stats/Info (Placeholder for now) */}
         <div className="space-y-6">
            <div className="p-6 rounded-lg border bg-muted/20">
                <h4 className="font-bold text-sm mb-4">Series Details</h4>
                <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Added</dt>
                        <dd>Not yet</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd>New Discovery</dd>
                    </div>
                </dl>
            </div>
         </div>
      </main>
    </div>
  );
}

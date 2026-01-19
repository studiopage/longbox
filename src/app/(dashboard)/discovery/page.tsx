import { browseComicVine } from '@/lib/comicvine'; // Use new function
import { DiscoveryFilters } from '@/components/longbox/discovery-filters';
import { PaginationBar } from '@/components/longbox/pagination-bar';
import { ImageOff } from 'lucide-react';
import Link from 'next/link';

export default async function DiscoveryPage({ searchParams }: { searchParams: Promise<{ publisher?: string, year?: string, sort?: string, page?: string }> }) {
  const params = await searchParams;
  
  const page = parseInt(params.page || '1');

  // Pure Browse Mode
  const results = await browseComicVine({
    publisherId: params.publisher,
    year: params.year,
    sort: params.sort,
    page: page
  });

  return (
    <main className="p-8 space-y-6">
       <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Discovery Portal</h1>
            <p className="text-muted-foreground">
              Explore the database by Publisher, Year, or Popularity.
              <br/>
              <span className="text-xs opacity-70">Looking for a specific title? Use the Search Bar at the top of the page.</span>
            </p>
       </div>

       {/* Filters (Publisher, Year, Sort) */}
       <DiscoveryFilters />

       {/* Results Grid */}
       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {results.map((item) => (
             <Link key={item.id} href={`/series/new?cvId=${item.id}`}>
                 <div className="group cursor-pointer space-y-3">
                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-sm relative border border-border/50">
                            {item.image?.medium_url ? (
                            <img src={item.image.medium_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                            <div className="w-full h-full flex items-center justify-center"><ImageOff className="opacity-20"/></div>
                            )}
                            
                            {/* Optional: Add Issue Count Badge */}
                            {item.count_of_issues !== undefined && (
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    {item.count_of_issues} Issues
                                </div>
                            )}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight truncate group-hover:text-primary transition-colors">{item.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{item.start_year} • {item.publisher?.name}</p>
                    </div>
                </div>
             </Link>
          ))}
       </div>

       {/* Pagination */}
       {results.length > 0 && (
         <PaginationBar hasResults={results.length === 24} />
       )}
       
       {results.length === 0 && (
         <div className="py-20 text-center text-muted-foreground bg-accent/10 rounded-lg border border-dashed">
            <p>No series found matching these filters.</p>
         </div>
       )}
    </main>
  );
}

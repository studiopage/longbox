import { db } from '@/db';
import { series, issues } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowRight, PieChart, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';

export async function GapReport() {
  noStore(); // Force dynamic rendering
  
  // Fetch series with issues using direct queries
  const allSeries = await db.select().from(series).orderBy(desc(series.updated_at)).limit(50);
  
  // Fetch issues for each series
  const seriesWithIssues = await Promise.all(
    allSeries.map(async (s) => {
      const seriesIssues = await db.select()
        .from(issues)
        .where(eq(issues.series_id, s.id));
      return { ...s, issues: seriesIssues };
    })
  );

  // Calculate Stats (No filter - show all recent series)
  const stats = seriesWithIssues
    .map(s => {
        const total = s.issue_count || s.issues.length || 1;
        // For now, we count "tracked" rows. 
        // In Module 5 (Komga Sync), we will change this to: s.issues.filter(i => i.status === 'downloaded').length
        const tracked = s.issues.length; 
        const percentage = Math.round((tracked / total) * 100);
        return { ...s, percentage, total, tracked };
    })
    .sort((a, b) => b.percentage - a.percentage) // Highest completion first
    .slice(0, 3); // Show top 3

  if (stats.length === 0) return null;

  return (
    <Card className="border-border bg-card">
        <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Collection Progress
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Completion status of your recent series.
            </p>
            
            <div className="space-y-4">
                {stats.map((item) => {
                    const isComplete = item.percentage >= 100;
                    
                    return (
                        <div key={item.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="truncate max-w-[150px]">{item.title}</span>
                                <span className={isComplete ? "text-green-500" : ""}>
                                    {item.percentage}%
                                </span>
                            </div>
                            
                            {/* Custom progress bar with color support */}
                            <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all ${
                                        isComplete ? 'bg-green-500' : 'bg-primary'
                                    }`}
                                    style={{ width: `${item.percentage}%` }}
                                />
                            </div>
                            
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    {isComplete ? (
                                        <><CheckCircle2 className="w-3 h-3 text-green-500" /> Complete Run</>
                                    ) : (
                                        `Missing ${item.total - item.tracked} issues`
                                    )}
                                </span>
                                <Link href={`/series/${item.id}`}>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-[10px]">
                                        View Details <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </CardContent>
    </Card>
  );
}

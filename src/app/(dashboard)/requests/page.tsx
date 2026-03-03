import { db } from '@/db';
import { requests, series, issues } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { QueueActions } from '@/components/longbox/queue-actions';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  noStore();
  // Fetch all requests
  const queue = await db.select({
    id: requests.id,
    status: requests.status,
    title: requests.title,
    requestIssueNumber: requests.issue_number,
    createdAt: requests.created_at,
    issueTitle: issues.title,
    issueNumber: issues.issue_number,
    seriesTitle: series.name,
    seriesId: series.id,
    seriesThumb: series.thumbnail_url,
  })
  .from(requests)
  .leftJoin(issues, eq(requests.issue_id, issues.id))
  .leftJoin(series, eq(requests.series_id, series.id))
  .orderBy(desc(requests.created_at));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Download Queue</h1>
            <p className="text-muted-foreground">Manage active acquisitions and history.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh Status
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Active Requests ({queue.length})</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Series</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {queue.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                Queue is empty. Go find some comics!
                            </TableCell>
                        </TableRow>
                    )}
                    
                    {queue.map((req) => (
                        <TableRow key={req.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-12 bg-muted rounded overflow-hidden shrink-0">
                                        {req.seriesThumb && <img src={req.seriesThumb} className="w-full h-full object-cover"/>}
                                    </div>
                                    {req.seriesId ? (
                                      <Link href={`/series/${req.seriesId}`} className="font-medium hover:underline">
                                        {req.seriesTitle || req.title}
                                      </Link>
                                    ) : (
                                      <span className="font-medium">{req.title}</span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm">{req.issueNumber || req.requestIssueNumber ? `#${req.issueNumber || req.requestIssueNumber}` : '-'}</span>
                                {req.issueTitle && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{req.issueTitle}</div>}
                            </TableCell>
                            <TableCell>
                                <Badge variant={req.status === 'requested' ? 'secondary' : 'outline'}>
                                    {req.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {req.createdAt ? formatDistanceToNow(new Date(req.createdAt), { addSuffix: true }) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                                <QueueActions requestId={req.id} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

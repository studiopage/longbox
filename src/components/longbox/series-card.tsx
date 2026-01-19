import { Series } from '@/types/longbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface SeriesCardProps {
  series: Series;
}

export function SeriesCard({ series }: SeriesCardProps) {
  return (
    <Link href={`/series/${series.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold">{series.title}</CardTitle>
            <Badge variant={series.status === 'ongoing' ? 'default' : 'secondary'}>
              {series.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {series.publisher} • {series.start_year}
          </p>
          {series.comicvine_id && (
            <p className="text-xs text-blue-500 mt-2 font-mono">
              CV-ID: {series.comicvine_id}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}


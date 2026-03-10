import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildNavigationFeed, OPDS_HEADERS } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const feed = buildNavigationFeed(
    'Longbox',
    '/api/opds/v1.2/catalog',
    [
      {
        title: 'All Series',
        href: '/api/opds/v1.2/series',
        content: 'Browse all series alphabetically',
      },
      {
        title: 'By Publisher',
        href: '/api/opds/v1.2/publishers',
        content: 'Browse series grouped by publisher',
      },
      {
        title: 'Recently Added',
        href: '/api/opds/v1.2/new',
        content: 'Recently added books',
      },
      {
        title: 'Reading List',
        href: '/api/opds/v1.2/reading',
        content: 'Your reading list',
      },
    ]
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}

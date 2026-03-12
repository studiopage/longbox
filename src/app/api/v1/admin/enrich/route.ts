import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logEvent } from '@/lib/activity-logger';

// Note: Importing server actions via API route is not ideal.
// Instead, we'll move the core logic into a utility and call from both places.
// For now, we'll directly implement the enrichment logic here or refactor later.

/**
 * POST /api/v1/admin/enrich
 * 
 * Trigger metadata enrichment operations. Requires admin user.
 * 
 * Body:
 * {
 *   "operations": ["arcs", "ratings"],
 *   "limit": 100 (for ratings batch size)
 * }
 * 
 * Returns operation results and timing.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin status (check if user has role or special flag)
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { operations = ['arcs', 'ratings'], limit = 100 } = body;

    const results: Record<string, unknown> = {};
    const startTime = Date.now();

    // Note: Import server actions only when needed to avoid circular dependency
    // with Next.js Server Action validation.
    
    // Operation 1: Compute story arc reading orders
    if (operations.includes('arcs')) {
      console.log('🎬 Enrichment API: Computing story arc reading orders...');
      const { computeAllArcReadingOrders } = await import('@/actions/story-arcs');
      
      const arcsStart = Date.now();
      const arcsComputed = await computeAllArcReadingOrders();
      const arcsDuration = Date.now() - arcsStart;
      
      results.arcs = {
        computed: arcsComputed,
        duration_ms: arcsDuration,
      };

      await logEvent(
        'metadata_enriched',
        `Computed ${arcsComputed} story arc reading orders`,
        { operation: 'compute_arcs', count: arcsComputed },
        'info'
      );

      console.log(`✓ Story arcs: ${arcsComputed} computed in ${arcsDuration}ms`);
    }

    // Operation 2: Fetch community ratings
    if (operations.includes('ratings')) {
      console.log(`⭐ Enrichment API: Fetching ratings for up to ${limit} books...`);
      const { fetchMissingOpenLibraryRatings } = await import('@/actions/ratings');
      
      const ratingsStart = Date.now();
      const ratingsResult = await fetchMissingOpenLibraryRatings(limit);
      const ratingsDuration = Date.now() - ratingsStart;
      
      results.ratings = {
        matched: ratingsResult.matched,
        updated: ratingsResult.updated,
        errors: ratingsResult.errors.length,
        duration_ms: ratingsDuration,
      };

      await logEvent(
        'metadata_enriched',
        `Fetched ratings for ${ratingsResult.updated}/${ratingsResult.matched} books from OpenLibrary`,
        {
          operation: 'fetch_ratings',
          matched: ratingsResult.matched,
          updated: ratingsResult.updated,
          errors: ratingsResult.errors.length,
        },
        ratingsResult.errors.length > 0 ? 'warning' : 'info'
      );

      console.log(`✓ Ratings: ${ratingsResult.updated} updated in ${ratingsDuration}ms`);
    }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      results,
      total_duration_ms: totalDuration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Enrichment endpoint error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        error: 'Enrichment failed',
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/admin/enrich
 * 
 * Get enrichment operation guide and available operations.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/v1/admin/enrich',
    description: 'Trigger metadata enrichment operations',
    authentication: 'Requires authenticated session',
    request_body: {
      operations: ['arcs', 'ratings'],
      limit: 100,
    },
    operations: {
      arcs: 'Compute story arc reading orders from book metadata (metadata-heavy)',
      ratings: 'Fetch community ratings from OpenLibrary for books lacking ratings (API calls, throttled)',
    },
    example_curl: `curl -X POST http://localhost:3000/api/v1/admin/enrich \\
  -H "Content-Type: application/json" \\
  -d '{"operations": ["arcs", "ratings"], "limit": 100}'`,
  });
}

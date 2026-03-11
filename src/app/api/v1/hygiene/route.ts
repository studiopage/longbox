/**
 * POST /api/v1/hygiene
 *
 * Data hygiene endpoints for library maintenance.
 * Protected by Basic Auth (admin use only).
 *
 * Actions (via ?action= query param):
 *   - duplicates: Find duplicate series
 *   - merge: Merge duplicate series (body: { targetId, sourceIds })
 *   - orphans: Find orphaned data (empty series, missing files)
 *   - cleanup-series: Delete empty series
 *   - cleanup-files: Remove books with missing files
 *   - backfill-pages: Backfill page counts for books with count=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import {
  findDuplicateSeries,
  mergeSeries,
  findOrphans,
  cleanupEmptySeries,
  cleanupMissingFiles,
  backfillPageCounts,
  validateMediaIntegrity,
  auditDataConsistency,
  auditNamingConventions,
} from '@/actions/data-hygiene';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const action = request.nextUrl.searchParams.get('action');

  switch (action) {
    case 'duplicates': {
      const result = await findDuplicateSeries();
      return NextResponse.json(result);
    }

    case 'merge': {
      const body = await request.json();
      const { targetId, sourceIds } = body;
      if (!targetId || !Array.isArray(sourceIds)) {
        return NextResponse.json({ error: 'Missing targetId or sourceIds' }, { status: 400 });
      }
      const result = await mergeSeries(targetId, sourceIds);
      return NextResponse.json(result);
    }

    case 'orphans': {
      const result = await findOrphans();
      return NextResponse.json({
        emptySeries: result.emptySeries.length,
        missingFiles: result.missingFiles.length,
        details: result,
      });
    }

    case 'cleanup-series': {
      const result = await cleanupEmptySeries();
      return NextResponse.json(result);
    }

    case 'cleanup-files': {
      const result = await cleanupMissingFiles();
      return NextResponse.json(result);
    }

    case 'backfill-pages': {
      const batchSize = parseInt(request.nextUrl.searchParams.get('batch') || '50');
      const result = await backfillPageCounts(batchSize);
      return NextResponse.json(result);
    }

    case 'validate-media': {
      const batchSize = parseInt(request.nextUrl.searchParams.get('batch') || '100');
      const result = await validateMediaIntegrity(batchSize);
      return NextResponse.json(result);
    }

    case 'audit-consistency': {
      const result = await auditDataConsistency();
      return NextResponse.json(result);
    }

    case 'audit-naming': {
      const result = await auditNamingConventions();
      return NextResponse.json(result);
    }

    default:
      return NextResponse.json({
        error: 'Unknown action',
        actions: ['duplicates', 'merge', 'orphans', 'cleanup-series', 'cleanup-files', 'backfill-pages', 'validate-media', 'audit-consistency', 'audit-naming'],
      }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const action = request.nextUrl.searchParams.get('action');

  switch (action) {
    case 'duplicates': {
      const result = await findDuplicateSeries();
      return NextResponse.json(result);
    }

    case 'orphans': {
      const result = await findOrphans();
      return NextResponse.json({
        emptySeries: result.emptySeries.length,
        missingFiles: result.missingFiles.length,
        details: result,
      });
    }

    case 'validate-media': {
      const batchSize = parseInt(request.nextUrl.searchParams.get('batch') || '100');
      const result = await validateMediaIntegrity(batchSize);
      return NextResponse.json(result);
    }

    case 'audit-consistency': {
      const result = await auditDataConsistency();
      return NextResponse.json(result);
    }

    case 'audit-naming': {
      const result = await auditNamingConventions();
      return NextResponse.json(result);
    }

    default:
      return NextResponse.json({
        message: 'Data hygiene API. Use POST for mutations, GET for queries.',
        actions: {
          GET: ['duplicates', 'orphans', 'validate-media', 'audit-consistency', 'audit-naming'],
          POST: ['duplicates', 'merge', 'orphans', 'cleanup-series', 'cleanup-files', 'backfill-pages', 'validate-media', 'audit-consistency', 'audit-naming'],
        },
      });
  }
}

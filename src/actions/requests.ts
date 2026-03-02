'use server'

import { db } from '@/db';
import { issues, requests, series } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getComicVineIssues, getComicVineVolume } from '@/lib/comicvine';

// ------------------------------------------------------------------
// REPAIR TOOL: Force Sync Issues (Fixes the "0 Issues" bug)
// ------------------------------------------------------------------
export async function forceSyncIssuesAction(seriesId: string, cvId: string) {
  console.log(`🔄 Syncing issues AND metadata for Local Series ${seriesId} (CV ${cvId})...`);

  const [cvIssues, cvVolume] = await Promise.all([
    getComicVineIssues(cvId),
    getComicVineVolume(cvId)
  ]);

  if (!cvIssues || cvIssues.length === 0) {
    return { success: false, message: "No issues found on ComicVine." };
  }

  if (cvVolume) {
    await db.update(series).set({
      description: cvVolume.description || null,
      publisher: cvVolume.publisher?.name || null,
      updated_at: new Date()
    }).where(eq(series.id, seriesId));
  }

  const existingIssues = await db.select().from(issues).where(eq(issues.series_id, seriesId));
  const existingIds = new Set(existingIssues.map(i => i.cv_id));

  const newRows = cvIssues
    .filter((iss: any) => !existingIds.has(iss.id))
    .map((iss: any) => ({
      series_id: seriesId,
      cv_id: iss.id,
      issue_number: iss.issue_number?.toString() || '0',
      title: iss.name || `Issue #${iss.issue_number}`,
      cover_date: iss.cover_date || null,
      thumbnail_url: iss.image?.medium_url || null,
      status: 'missing'
    }));

  if (newRows.length > 0) {
    await db.insert(issues).values(newRows);
  }

  revalidatePath(`/series/${seriesId}`);
  revalidatePath('/library');
  return { success: true, count: newRows.length };
}

// ------------------------------------------------------------------
// MAIN ACTION: Request an Issue
// ------------------------------------------------------------------
export async function requestIssueAction(issueId: string) {
  const [issue] = await db.select()
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);

  if (!issue || !issue.series_id) {
    return { success: false, message: "Issue not found" };
  }

  // Update status to 'wanted'
  await db.update(issues)
    .set({ status: 'wanted' })
    .where(eq(issues.id, issueId));

  // Log to request queue
  await db.insert(requests).values({
    issue_id: issueId,
    series_id: issue.series_id,
    status: 'pending'
  });

  revalidatePath(`/series/${issue.series_id}`);
  return { success: true };
}

// ------------------------------------------------------------------
// BATCH ACTION: Request All Missing
// ------------------------------------------------------------------
export async function requestAllMissingAction(seriesId: string) {
  const missingIssues = await db.select().from(issues).where(
    and(
        eq(issues.series_id, seriesId),
        eq(issues.status, 'missing')
    )
  );

  if (missingIssues.length === 0) {
    return { success: false, message: "No missing issues to request." };
  }

  const requestRows = missingIssues.map(issue => ({
    issue_id: issue.id,
    series_id: seriesId,
    status: 'pending'
  }));

  const issueIds = missingIssues.map(i => i.id);

  await db.transaction(async (tx) => {
    await tx.insert(requests).values(requestRows);
    await tx.update(issues)
      .set({ status: 'wanted' })
      .where(inArray(issues.id, issueIds));
  });

  revalidatePath(`/series/${seriesId}`);
  return { success: true, count: missingIssues.length };
}

// ------------------------------------------------------------------
// REMOVE REQUEST (Undo)
// ------------------------------------------------------------------
export async function deleteRequestAction(requestId: string) {
  const [req] = await db.select()
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  if (!req) return { success: false, message: "Request not found" };

  await db.delete(requests).where(eq(requests.id, requestId));

  await db.update(issues)
    .set({ status: 'missing' })
    .where(eq(issues.id, req.issue_id));

  revalidatePath('/requests');
  revalidatePath(`/series/${req.series_id}`);
  return { success: true };
}

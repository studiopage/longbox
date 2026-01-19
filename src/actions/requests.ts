'use server'

import { db } from '@/db';
import { issues, requests, series } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getComicVineIssues, getComicVineVolume } from '@/lib/comicvine';
import { sendToKapowarr } from '@/lib/kapowarr';

// ------------------------------------------------------------------
// REPAIR TOOL: Force Sync Issues (Fixes the "0 Issues" bug)
// ------------------------------------------------------------------
export async function forceSyncIssuesAction(seriesId: string, cvId: string) {
  console.log(`🔄 Syncing issues AND metadata for Local Series ${seriesId} (CV ${cvId})...`);
  
  // 1. Parallel Fetch: Issues AND Volume Metadata
  const [cvIssues, cvVolume] = await Promise.all([
    getComicVineIssues(cvId),
    getComicVineVolume(cvId)
  ]);
  
  if (!cvIssues || cvIssues.length === 0) {
    return { success: false, message: "No issues found on ComicVine." };
  }

  // 2. Update Series Metadata (Fixes the "0 Issues" bug)
  if (cvVolume) {
    await db.update(series).set({
      issue_count: cvVolume.count_of_issues || cvIssues.length, // Fallback to actual list length
      description: cvVolume.description || null,
      publisher: cvVolume.publisher?.name || null,
      updated_at: new Date()
    }).where(eq(series.id, seriesId));
  }

  // 3. Upsert Issues (Existing Logic)
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
  revalidatePath('/library'); // Refresh the grid counts
  return { success: true, count: newRows.length };
}

// ------------------------------------------------------------------
// MAIN ACTION: Request an Issue
// ------------------------------------------------------------------
export async function requestIssueAction(issueId: string) {
  // 1. Get Issue Details (using direct query since relational API might not be available)
  const [issue] = await db.select()
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);

  if (!issue || !issue.series_id) {
    return { success: false, message: "Issue not found" };
  }

  // 2. Get Series details
  const [seriesData] = await db.select()
    .from(series)
    .where(eq(series.id, issue.series_id))
    .limit(1);

  if (!seriesData) {
    return { success: false, message: "Series not found" };
  }

  // 3. Update Status to 'wanted' (Optimistic UI support)
  await db.update(issues)
    .set({ status: 'wanted' })
    .where(eq(issues.id, issueId));

  // 4. Log to Request Queue
  await db.insert(requests).values({
    issue_id: issueId,
    series_id: issue.series_id,
    status: 'sent_to_kapowarr'
  });

  // 5. Send to Downloader
  await sendToKapowarr(
    issue.title || `Issue #${issue.issue_number}`, 
    seriesData.title, 
    seriesData.start_year || 2000
  );

  revalidatePath(`/series/${issue.series_id}`);
  return { success: true };
}

// ------------------------------------------------------------------
// BATCH ACTION: Request All Missing
// ------------------------------------------------------------------
export async function requestAllMissingAction(seriesId: string) {
  // 1. Find all missing issues for this series
  const missingIssues = await db.select().from(issues).where(
    and(
        eq(issues.series_id, seriesId),
        eq(issues.status, 'missing')
    )
  );

  if (missingIssues.length === 0) {
    return { success: false, message: "No missing issues to request." };
  }

  // 2. Prepare Batch Data
  const requestRows = missingIssues.map(issue => ({
    issue_id: issue.id,
    series_id: seriesId,
    status: 'sent_to_kapowarr'
  }));

  const issueIds = missingIssues.map(i => i.id);

  // 3. Update DB (Transaction-like)
  await db.transaction(async (tx) => {
    // A. Create Requests
    await tx.insert(requests).values(requestRows);
    
    // B. Update Issues Status
    await tx.update(issues)
      .set({ status: 'wanted' })
      .where(inArray(issues.id, issueIds));
  });

  // 4. Send to Kapowarr (Async Loop)
  // Note: In production, use a job queue (BullMQ). For MVP, `Promise.all` is fine.
  // We fetch the series metadata once to save DB calls in the loop
  const [seriesMeta] = await db.select()
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);

  if (seriesMeta) {
    await Promise.all(missingIssues.map(issue => 
        sendToKapowarr(issue.title || '', seriesMeta.title, seriesMeta.start_year || 2000)
    ));
  }

  revalidatePath(`/series/${seriesId}`);
  return { success: true, count: missingIssues.length };
}

// ------------------------------------------------------------------
// REMOVE REQUEST (Undo)
// ------------------------------------------------------------------
export async function deleteRequestAction(requestId: string) {
  // 1. Get request details to find the issue_id
  const [req] = await db.select()
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  if (!req) return { success: false, message: "Request not found" };

  // 2. Delete the request row
  await db.delete(requests).where(eq(requests.id, requestId));

  // 3. Reset Issue Status to 'missing'
  // (Optional: If you downloaded it, you might not want to reset it, 
  // but for a "Cancel" action, reverting to missing is correct logic)
  await db.update(issues)
    .set({ status: 'missing' })
    .where(eq(issues.id, req.issue_id));

  revalidatePath('/requests');
  revalidatePath(`/series/${req.series_id}`); // Update the series page too
  return { success: true };
}

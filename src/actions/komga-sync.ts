'use server'

import { db } from '@/db';
import { series, issues } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { searchKomgaSeries, getKomgaBooks } from '@/lib/komga';
import { revalidatePath } from 'next/cache';

export async function syncSeriesWithKomgaAction(localSeriesId: string) {
  // 1. Get Local Data (using direct queries)
  const [localSeriesData] = await db.select()
    .from(series)
    .where(eq(series.id, localSeriesId))
    .limit(1);

  if (!localSeriesData) {
    return { success: false, message: "Series not found" };
  }

  // Fetch issues for this series
  const localIssues = await db.select()
    .from(issues)
    .where(eq(issues.series_id, localSeriesId));

  const localSeries = { ...localSeriesData, issues: localIssues };

  let komgaBooks: any[] = [];

  // 2. Fetch from Komga
  if (localSeries.komga_id) {
    console.log(`🎯 Using Komga ID: ${localSeries.komga_id}`);
    komgaBooks = await getKomgaBooks(localSeries.komga_id);
  } else {
    // STRATEGY B: Fuzzy Title Search (Fallback)
    console.log(`📡 Searching Komga for: ${localSeries.title}`);
    const results = await searchKomgaSeries(localSeries.title);
    const match = results.find(k => 
      k.metadata.title?.toLowerCase() === localSeries.title.toLowerCase() || 
      k.name.toLowerCase() === localSeries.title.toLowerCase()
    );
    
    if (match) {
      // Found it! Save the ID for next time
      await db.update(series).set({ komga_id: match.id }).where(eq(series.id, localSeriesId));
      komgaBooks = await getKomgaBooks(match.id);
    }
  }

  // 🔴 DEBUG BLOCK: PRINT WHAT KOMGA SENT
  console.log(`📂 Komga returned ${komgaBooks.length} books.`);
  if (komgaBooks.length > 0) {
      console.log("🔍 SAMPLE BOOK DATA:", JSON.stringify({
          name: komgaBooks[0].name,
          metadataNumber: komgaBooks[0].metadata.number,
          id: komgaBooks[0].id
      }, null, 2));
  }

  if (komgaBooks.length === 0) {
    return { success: false, message: "No files found in Komga" };
  }

  // 3. Match Files
  let matchedCount = 0;
  for (const issue of localSeries.issues) {
    // 🔴 UPGRADED MATCHING LOGIC (Flexible Numbers)
    const file = komgaBooks.find(b => {
        // Normalize Komga Number: "01" -> "1", "1.0" -> "1"
        const kNum = parseFloat(b.metadata.number || "0");
        const iNum = parseFloat(issue.issue_number || "0");
        return kNum === iNum && kNum !== 0; // Don't match if both are 0 (unless special)
    });

    if (file) {
        console.log(`✅ MATCH: Issue #${issue.issue_number} <-> File: ${file.name}`);
        const isRead = file.readProgress?.completed || false;
        await db.update(issues)
            .set({ status: 'downloaded', read: isRead })
            .where(eq(issues.id, issue.id));
        matchedCount++;
    } else {
         console.log(`❌ NO MATCH: Issue #${issue.issue_number}`);
    }
  }

  revalidatePath(`/series/${localSeriesId}`);
  revalidatePath('/library');
  
  // Return descriptive error if 0 matches
  if (matchedCount === 0 && komgaBooks.length > 0) {
      return { success: false, message: `Found ${komgaBooks.length} files but matched 0. Check Terminal Logs.` };
  }
  
  return { success: true, matched: matchedCount, message: `Synced! Matched ${matchedCount} files.` };
}


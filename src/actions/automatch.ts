'use server'

import { v4 as uuidv4 } from 'uuid';
import { searchComicVineOnly } from '@/lib/search-service';
import { importSeriesAction } from '@/actions/library';
import { parseFilename } from '@/utils/parser';
import { QueueManager } from '@/utils/queue';
import { getSimilarity, normalize } from '@/utils/string';

const AUTO_IMPORT_THRESHOLD = 0.98; // 98% = Trust Blindly
const QUEUE_THRESHOLD = 0.60;       // 60% = Ask Human


export async function tryAutoMatchAction(localSeries: any) {
  const queue = new QueueManager();

  // 1. Clean the Input using parser
  const folderName = localSeries.metadata?.title || localSeries.name || '';
  const { cleanTitle, year: parsedYear } = parseFilename(folderName);

  // Use parsed year, fallback to releaseDate
  const year = parsedYear
    ? parseInt(parsedYear, 10)
    : (localSeries.metadata?.releaseDate
        ? new Date(localSeries.metadata.releaseDate).getFullYear()
        : null);
  
  // 2. Search Remote (using cleanTitle improves API results significantly)
  const candidates = await searchComicVineOnly(cleanTitle);
  if (!candidates || candidates.length === 0) {
    return { success: false, reason: "No results found" };
  }

  // 3. Score Candidates
  let bestMatch = null;
  let highestScore = 0;

  for (const candidate of candidates) {
    // HARD GATE: Year Mismatch
    // If we have a local year, and remote has a year, they MUST match.
    if (year && candidate.start_year && year !== parseInt(candidate.start_year, 10)) {
      continue; 
    }

    const score = getSimilarity(normalize(cleanTitle), normalize(candidate.name));
    
    // Bonus for Exact Year Match if title is close
    // This helps prioritize "Saga (2012)" over "Saga (1980)" if titles are identical
    const yearBonus = (year && year === parseInt(candidate.start_year || '0', 10)) ? 0.05 : 0;
    const finalScore = score + yearBonus;

    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestMatch = candidate;
    }
  }

  // 4. Decision Matrix
  if (bestMatch && highestScore >= AUTO_IMPORT_THRESHOLD) {
    console.log(`✅ [AUTO] Importing "${cleanTitle}" -> "${bestMatch.name}" (${(highestScore*100).toFixed(1)}%)`);
    await importSeriesAction(bestMatch.id.toString());
    return { success: true, match: bestMatch.name, cvId: bestMatch.id };

  } else if (bestMatch && highestScore >= QUEUE_THRESHOLD) {
    console.log(`⚠️ [QUEUE] Staging "${cleanTitle}" vs "${bestMatch.name}" (${(highestScore*100).toFixed(1)}%)`);
    
    queue.add({
      id: uuidv4(),
      filePath: localSeries.id,
      localTitle: cleanTitle,
      localYear: parsedYear,
      remoteId: bestMatch.id.toString(),
      remoteTitle: bestMatch.name,
      remoteYear: bestMatch.start_year || null,
      score: highestScore * 100,
      status: 'pending',
      timestamp: Date.now()
    });

    return { success: false, reason: `Queued for review (${(highestScore*100).toFixed(1)}% confidence)` };

  } else {
    console.log(`❌ [SKIP] No viable match for "${cleanTitle}"`);
    return { success: false, reason: "No confident match" };
  }
}


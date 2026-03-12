'use server';

import { db } from '@/db';
import { books, characters, book_characters } from '@/db/schema';
import { isNotNull, eq } from 'drizzle-orm';

/**
 * Phase 2: Migrate main_characters jsonb data to normalized characters + book_characters tables
 * One-time background operation
 */
export async function migrateCharactersToNormalized(
  limit: number = 100
): Promise<{ processed: number; created: number; linked: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  let created = 0;
  let linked = 0;

  try {
    // Find books with main_characters data
    const booksWithChars = await db
      .select({
        id: books.id,
        mainCharacters: books.main_characters,
      })
      .from(books)
      .where(isNotNull(books.main_characters))
      .limit(limit);

    for (const book of booksWithChars) {
      try {
        if (!Array.isArray(book.mainCharacters)) continue;

        for (const char of book.mainCharacters) {
          // Extract character data from main_characters
          const charData = char as any;
          const cvId = charData.id;
          const charName = charData.name || 'Unknown';

          if (!cvId || !charName) continue;

          // Upsert character into characters table
          const [charRecord] = await db
            .insert(characters)
            .values({
              cv_id: cvId,
              name: charName,
              image_url: charData.url,
              popularity_score: 0,
              appearances_count: 0,
            })
            .onConflictDoNothing()
            .returning({ id: characters.id });

          if (!charRecord) {
            // Character already exists, fetch it
            const [existing] = await db
              .select({ id: characters.id })
              .from(characters)
              .where(eq(characters.cv_id, cvId));

            if (existing) {
              // Link book to character
              await db
                .insert(book_characters)
                .values({
                  book_id: book.id,
                  character_id: existing.id,
                  is_main: true,
                })
                .onConflictDoNothing();
              linked++;
            }
          } else {
            // Link newly created character
            await db
              .insert(book_characters)
              .values({
                book_id: book.id,
                character_id: charRecord.id,
                is_main: true,
              })
              .onConflictDoNothing();
            linked++;
            created++;
          }
        }

        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Book ${book.id}: ${msg}`);
      }
    }

    return { processed, created, linked, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Migration failed: ${msg}`);
    return { processed, created, linked, errors };
  }
}

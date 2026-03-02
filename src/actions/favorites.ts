'use server';

import { db } from '@/db';
import { favoriteCharacters, favoriteSeries } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface FavoriteCharacter {
  id: string;
  characterId: number;
  characterName: string;
  characterImage: string | null;
  characterPublisher: string | null;
  createdAt: Date | null;
}

/**
 * Add a character to favorites
 */
export async function addFavoriteCharacter(
  characterId: number,
  characterName: string,
  characterImage?: string,
  characterPublisher?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(favoriteCharacters).values({
      character_id: characterId,
      character_name: characterName,
      character_image: characterImage || null,
      character_publisher: characterPublisher || null,
    }).onConflictDoNothing();

    revalidatePath('/');
    revalidatePath('/discover/characters');

    return { success: true };
  } catch (error) {
    console.error('[FAVORITES] Failed to add favorite:', error);
    return { success: false, error: 'Failed to add favorite' };
  }
}

/**
 * Remove a character from favorites
 */
export async function removeFavoriteCharacter(
  characterId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(favoriteCharacters)
      .where(eq(favoriteCharacters.character_id, characterId));

    revalidatePath('/');
    revalidatePath('/discover/characters');

    return { success: true };
  } catch (error) {
    console.error('[FAVORITES] Failed to remove favorite:', error);
    return { success: false, error: 'Failed to remove favorite' };
  }
}

/**
 * Check if a character is favorited
 */
export async function isCharacterFavorited(characterId: number): Promise<boolean> {
  try {
    const result = await db.select({ id: favoriteCharacters.id })
      .from(favoriteCharacters)
      .where(eq(favoriteCharacters.character_id, characterId))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('[FAVORITES] Failed to check favorite:', error);
    return false;
  }
}

/**
 * Get all favorite characters
 */
export async function getFavoriteCharacters(): Promise<FavoriteCharacter[]> {
  try {
    const results = await db.select()
      .from(favoriteCharacters)
      .orderBy(favoriteCharacters.created_at);

    return results.map(r => ({
      id: r.id,
      characterId: r.character_id,
      characterName: r.character_name,
      characterImage: r.character_image,
      characterPublisher: r.character_publisher,
      createdAt: r.created_at,
    }));
  } catch (error) {
    console.error('[FAVORITES] Failed to get favorites:', error);
    return [];
  }
}

/**
 * Get favorite character IDs (for quick lookup)
 */
export async function getFavoriteCharacterIds(): Promise<number[]> {
  try {
    const results = await db.select({ characterId: favoriteCharacters.character_id })
      .from(favoriteCharacters);

    return results.map(r => r.characterId);
  } catch (error) {
    console.error('[FAVORITES] Failed to get favorite IDs:', error);
    return [];
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavoriteCharacter(
  characterId: number,
  characterName: string,
  characterImage?: string,
  characterPublisher?: string
): Promise<{ success: boolean; isFavorited: boolean; error?: string }> {
  try {
    const isFavorited = await isCharacterFavorited(characterId);

    if (isFavorited) {
      await removeFavoriteCharacter(characterId);
      return { success: true, isFavorited: false };
    } else {
      await addFavoriteCharacter(characterId, characterName, characterImage, characterPublisher);
      return { success: true, isFavorited: true };
    }
  } catch (error) {
    console.error('[FAVORITES] Failed to toggle favorite:', error);
    return { success: false, isFavorited: false, error: 'Failed to toggle favorite' };
  }
}

// ============================================
// SERIES FAVORITES
// ============================================

/**
 * Check if a series is favorited
 */
export async function isSeriesFavorited(seriesId: string): Promise<boolean> {
  try {
    const result = await db.select({ id: favoriteSeries.id })
      .from(favoriteSeries)
      .where(eq(favoriteSeries.series_id, seriesId))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('[FAVORITES] Failed to check series favorite:', error);
    return false;
  }
}

/**
 * Toggle series favorite status
 */
export async function toggleFavoriteSeries(
  seriesId: string
): Promise<{ success: boolean; isFavorited: boolean; error?: string }> {
  try {
    const isFavorited = await isSeriesFavorited(seriesId);

    if (isFavorited) {
      await db.delete(favoriteSeries).where(eq(favoriteSeries.series_id, seriesId));
      revalidatePath(`/series/${seriesId}`);
      revalidatePath('/library');
      return { success: true, isFavorited: false };
    } else {
      await db.insert(favoriteSeries).values({ series_id: seriesId }).onConflictDoNothing();
      revalidatePath(`/series/${seriesId}`);
      revalidatePath('/library');
      return { success: true, isFavorited: true };
    }
  } catch (error) {
    console.error('[FAVORITES] Failed to toggle series favorite:', error);
    return { success: false, isFavorited: false, error: 'Failed to toggle favorite' };
  }
}

/**
 * Get all favorite series IDs
 */
export async function getFavoriteSeriesIds(): Promise<string[]> {
  try {
    const results = await db.select({ seriesId: favoriteSeries.series_id })
      .from(favoriteSeries);

    return results.map(r => r.seriesId);
  } catch (error) {
    console.error('[FAVORITES] Failed to get favorite series IDs:', error);
    return [];
  }
}

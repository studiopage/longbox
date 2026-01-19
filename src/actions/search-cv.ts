'use server'

import { searchComicVine } from '@/lib/comicvine';

export async function searchComicVineAction(query: string) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  return await searchComicVine(query);
}


'use server'

import { searchComicVine } from '@/lib/comicvine';

export async function searchSeries(query: string) {
  // Simple pass-through wrapper
  return await searchComicVine(query);
}


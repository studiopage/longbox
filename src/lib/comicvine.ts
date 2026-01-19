import { z } from 'zod';
import { getSettings } from '@/actions/settings'; // Import the DB getter

const BASE_URL = 'https://comicvine.gamespot.com/api';

const CVVolumeSchema = z.object({
  id: z.number(),
  name: z.string(),
  start_year: z.string().nullable().optional(),
  publisher: z.object({ name: z.string() }).nullable().optional(),
  image: z.object({ medium_url: z.string() }).nullable().optional(),
  description: z.string().nullable().optional(),
  count_of_issues: z.number().optional(),
});

export type BrowseParams = {
  publisherId?: string;
  year?: string;
  sort?: string;
  page?: number;
};

// HELPER: Fetch Key dynamically
async function getApiKey() {
  const settings = await getSettings();
  return settings?.cv_api_key;
}

// 1. BROWSE FUNCTION
export async function browseComicVine(params: BrowseParams) {
  const CV_API_KEY = await getApiKey();
  if (!CV_API_KEY) return [];

  const page = params.page && params.page > 1 ? params.page : 1;
  const limit = 24;
  const offset = (page - 1) * limit;

  let url = `${BASE_URL}/volumes/?api_key=${CV_API_KEY}&format=json&limit=${limit}&offset=${offset}`;

  const filterParts: string[] = [];
  if (params.year && params.year !== 'all') filterParts.push(`start_year:${params.year}`);
  if (params.publisherId && params.publisherId !== 'all') filterParts.push(`publisher:${params.publisherId}`);
  
  if (filterParts.length > 0) {
    url += `&filter=${filterParts.join(',')}`;
  }

  const sortMap: Record<string, string> = {
    newest: 'date_added:desc',
    oldest: 'start_year:asc',
    year_desc: 'start_year:desc',
    popular: 'issue_count:desc',
    alpha: 'name:asc',
  };
  
  url += `&sort=${sortMap[params.sort || 'newest'] || 'date_added:desc'}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Vidiai-Longbox/1.0' }, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return z.array(CVVolumeSchema).parse(data.results);
  } catch (error) {
    console.error('CV Browse Failed:', error);
    return [];
  }
}

// 2. SEARCH FUNCTION
export async function searchComicVine(query: string, limit: number = 10) {
  const CV_API_KEY = await getApiKey();
  if (!CV_API_KEY) return [];

  const url = `${BASE_URL}/search/?api_key=${CV_API_KEY}&format=json&resources=volume&query=${encodeURIComponent(query)}&limit=${limit}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Vidiai-Longbox/1.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    return z.array(CVVolumeSchema).parse(data.results);
  } catch (error) {
    return [];
  }
}

// 3. FRESH SERIES
export async function getFreshSeries() {
    return browseComicVine({ sort: 'newest' });
}

// 4. GET SINGLE VOLUME (For the Details Page)
export async function getComicVineVolume(id: string) {
    const CV_API_KEY = await getApiKey();
    if (!CV_API_KEY) return null;

    // Note: ComicVine IDs for volumes are typically '4050-ID'
    const url = `${BASE_URL}/volume/4050-${id}/?api_key=${CV_API_KEY}&format=json`;
  
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Vidiai-Longbox/1.0' } });
      if (!res.ok) throw new Error('CV API Error');
      const data = await res.json();
      // Handle if ComicVine returns an Array vs a Single Object
      const result = Array.isArray(data.results) ? data.results[0] : data.results;
      
      if (!result) return null; // Safety check if array was empty
      
      return CVVolumeSchema.parse(result);
    } catch (error) {
      console.error('CV Volume Fetch Failed:', error);
      return null;
    }
}

// 5. GET VOLUME ISSUES (New Requirement for Details Page)
export async function getComicVineIssues(volumeId: string) {
  const CV_API_KEY = await getApiKey();
  if (!CV_API_KEY) return [];

  // Fetch issues for a specific volume
  const url = `${BASE_URL}/issues/?api_key=${CV_API_KEY}&format=json&filter=volume:${volumeId}&sort=cover_date:desc`;

  try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Vidiai-Longbox/1.0' } });
      if (!res.ok) return [];
      const data = await res.json();
      // We will define a quick schema here or just return raw for now
      return data.results;
  } catch (error) {
      return [];
  }
}

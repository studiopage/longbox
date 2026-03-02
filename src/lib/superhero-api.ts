import { z } from 'zod';

/**
 * SuperheroAPI Client
 *
 * Uses the akabab open-source superhero database which provides
 * comprehensive character data without requiring authentication.
 *
 * Source: https://github.com/akabab/superhero-api
 * CDN: https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/
 */

const BASE_URL = 'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api';

// Zod Schemas
const PowerstatsSchema = z.object({
  intelligence: z.number(),
  strength: z.number(),
  speed: z.number(),
  durability: z.number(),
  power: z.number(),
  combat: z.number(),
});

const AppearanceSchema = z.object({
  gender: z.string(),
  race: z.string().nullable(),
  height: z.array(z.string()),
  weight: z.array(z.string()),
  eyeColor: z.string(),
  hairColor: z.string(),
});

const BiographySchema = z.object({
  fullName: z.string(),
  alterEgos: z.string(),
  aliases: z.array(z.string()),
  placeOfBirth: z.string(),
  firstAppearance: z.string(),
  publisher: z.string().nullable(),
  alignment: z.string(),
});

const WorkSchema = z.object({
  occupation: z.string(),
  base: z.string(),
});

const ConnectionsSchema = z.object({
  groupAffiliation: z.string(),
  relatives: z.string(),
});

const ImagesSchema = z.object({
  xs: z.string(),
  sm: z.string(),
  md: z.string(),
  lg: z.string(),
});

const CharacterSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  powerstats: PowerstatsSchema,
  appearance: AppearanceSchema,
  biography: BiographySchema,
  work: WorkSchema,
  connections: ConnectionsSchema,
  images: ImagesSchema,
});

export type Powerstats = z.infer<typeof PowerstatsSchema>;
export type Character = z.infer<typeof CharacterSchema>;

// Cache for all characters (loaded once)
let allCharactersCache: Character[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (data is static)

/**
 * Load all characters from the API
 * Results are cached for 24 hours since the data is static
 */
async function loadAllCharacters(): Promise<Character[]> {
  // Return from cache if valid
  if (allCharactersCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return allCharactersCache;
  }

  try {
    const res = await fetch(`${BASE_URL}/all.json`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      console.error('[SUPERHERO] Failed to load characters:', res.status);
      return allCharactersCache || [];
    }

    const data = await res.json();
    const characters = z.array(CharacterSchema).parse(data);

    allCharactersCache = characters;
    cacheTimestamp = Date.now();

    console.log(`[SUPERHERO] Loaded ${characters.length} characters`);
    return characters;
  } catch (error) {
    console.error('[SUPERHERO] Load error:', error);
    return allCharactersCache || [];
  }
}

/**
 * Get a specific character by ID
 */
export async function getCharacterById(id: number): Promise<Character | null> {
  try {
    const res = await fetch(`${BASE_URL}/id/${id}.json`);
    if (!res.ok) return null;

    const data = await res.json();
    return CharacterSchema.parse(data);
  } catch (error) {
    console.error('[SUPERHERO] Get character error:', error);
    return null;
  }
}

/**
 * Search characters by name
 * @param query - Name to search for (case-insensitive partial match)
 * @param limit - Maximum number of results
 */
export async function searchCharacters(query: string, limit: number = 20): Promise<Character[]> {
  const characters = await loadAllCharacters();
  const lowerQuery = query.toLowerCase();

  return characters
    .filter(char =>
      char.name.toLowerCase().includes(lowerQuery) ||
      char.biography.fullName.toLowerCase().includes(lowerQuery) ||
      char.biography.aliases.some(alias => alias.toLowerCase().includes(lowerQuery))
    )
    .slice(0, limit);
}

/**
 * Get characters by publisher
 */
export async function getCharactersByPublisher(publisher: string, limit: number = 50): Promise<Character[]> {
  const characters = await loadAllCharacters();
  const lowerPublisher = publisher.toLowerCase();

  return characters
    .filter(char =>
      char.biography.publisher?.toLowerCase().includes(lowerPublisher)
    )
    .slice(0, limit);
}

/**
 * Get all unique publishers
 */
export async function getPublishers(): Promise<string[]> {
  const characters = await loadAllCharacters();
  const publishers = new Set<string>();

  characters.forEach(char => {
    if (char.biography.publisher) {
      publishers.add(char.biography.publisher);
    }
  });

  return Array.from(publishers).sort();
}

/**
 * Get top heroes by a specific stat
 */
export async function getTopByPowerstat(
  stat: keyof Powerstats,
  limit: number = 10
): Promise<Character[]> {
  const characters = await loadAllCharacters();

  return characters
    .filter(char => char.powerstats[stat] > 0)
    .sort((a, b) => b.powerstats[stat] - a.powerstats[stat])
    .slice(0, limit);
}

/**
 * Get heroes (alignment: good)
 */
export async function getHeroes(limit: number = 50): Promise<Character[]> {
  const characters = await loadAllCharacters();

  return characters
    .filter(char => char.biography.alignment === 'good')
    .slice(0, limit);
}

/**
 * Get villains (alignment: bad)
 */
export async function getVillains(limit: number = 50): Promise<Character[]> {
  const characters = await loadAllCharacters();

  return characters
    .filter(char => char.biography.alignment === 'bad')
    .slice(0, limit);
}

/**
 * Get characters by team affiliation
 */
export async function getCharactersByTeam(teamName: string, limit: number = 50): Promise<Character[]> {
  const characters = await loadAllCharacters();
  const lowerTeam = teamName.toLowerCase();

  return characters
    .filter(char =>
      char.connections.groupAffiliation.toLowerCase().includes(lowerTeam)
    )
    .slice(0, limit);
}

/**
 * Get a random selection of characters
 */
export async function getRandomCharacters(count: number = 10): Promise<Character[]> {
  const characters = await loadAllCharacters();
  const shuffled = [...characters].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Calculate overall power level (average of all stats)
 */
export function calculatePowerLevel(powerstats: Powerstats): number {
  const total = Object.values(powerstats).reduce((sum, val) => sum + val, 0);
  return Math.round(total / 6);
}

/**
 * Get dominant power category for a character
 */
export function getDominantPower(powerstats: Powerstats): string {
  const entries = Object.entries(powerstats) as [keyof Powerstats, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

/**
 * Format character for display
 */
export function formatCharacter(char: Character): {
  name: string;
  realName: string;
  publisher: string;
  alignment: string;
  powerLevel: number;
  firstAppearance: string;
  image: string;
} {
  return {
    name: char.name,
    realName: char.biography.fullName || char.name,
    publisher: char.biography.publisher || 'Unknown',
    alignment: char.biography.alignment,
    powerLevel: calculatePowerLevel(char.powerstats),
    firstAppearance: char.biography.firstAppearance || 'Unknown',
    image: char.images.md,
  };
}

/**
 * Get character count by publisher (for stats)
 */
export async function getPublisherStats(): Promise<Map<string, number>> {
  const characters = await loadAllCharacters();
  const stats = new Map<string, number>();

  characters.forEach(char => {
    const publisher = char.biography.publisher || 'Unknown';
    stats.set(publisher, (stats.get(publisher) || 0) + 1);
  });

  return stats;
}

/**
 * Preload characters (call on app start for faster subsequent queries)
 */
export async function preloadCharacters(): Promise<void> {
  await loadAllCharacters();
}

/**
 * Get total character count
 */
export async function getCharacterCount(): Promise<number> {
  const characters = await loadAllCharacters();
  return characters.length;
}

/**
 * Paginated character results
 */
export interface PaginatedCharacters {
  characters: Character[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get all characters with pagination
 */
export async function getAllCharactersPaginated(
  page: number = 1,
  pageSize: number = 24
): Promise<PaginatedCharacters> {
  const characters = await loadAllCharacters();
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    characters: characters.slice(start, end),
    total: characters.length,
    page,
    pageSize,
    totalPages: Math.ceil(characters.length / pageSize),
  };
}

/**
 * Get heroes with pagination
 */
export async function getHeroesPaginated(
  page: number = 1,
  pageSize: number = 24
): Promise<PaginatedCharacters> {
  const characters = await loadAllCharacters();
  const heroes = characters.filter(char => char.biography.alignment === 'good');
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    characters: heroes.slice(start, end),
    total: heroes.length,
    page,
    pageSize,
    totalPages: Math.ceil(heroes.length / pageSize),
  };
}

/**
 * Get villains with pagination
 */
export async function getVillainsPaginated(
  page: number = 1,
  pageSize: number = 24
): Promise<PaginatedCharacters> {
  const characters = await loadAllCharacters();
  const villains = characters.filter(char => char.biography.alignment === 'bad');
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    characters: villains.slice(start, end),
    total: villains.length,
    page,
    pageSize,
    totalPages: Math.ceil(villains.length / pageSize),
  };
}

/**
 * Get characters by publisher with pagination
 */
export async function getCharactersByPublisherPaginated(
  publisher: string,
  page: number = 1,
  pageSize: number = 24
): Promise<PaginatedCharacters> {
  const characters = await loadAllCharacters();
  const lowerPublisher = publisher.toLowerCase();
  const filtered = characters.filter(char =>
    char.biography.publisher?.toLowerCase().includes(lowerPublisher)
  );
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    characters: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}

/**
 * Get top characters by powerstat with pagination
 */
export async function getTopByPowerstatPaginated(
  stat: keyof Powerstats,
  page: number = 1,
  pageSize: number = 24
): Promise<PaginatedCharacters> {
  const characters = await loadAllCharacters();
  const sorted = characters
    .filter(char => char.powerstats[stat] > 0)
    .sort((a, b) => b.powerstats[stat] - a.powerstats[stat]);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    characters: sorted.slice(start, end),
    total: sorted.length,
    page,
    pageSize,
    totalPages: Math.ceil(sorted.length / pageSize),
  };
}

/**
 * Search characters with pagination
 */
export async function searchCharactersPaginated(
  query: string,
  page: number = 1,
  pageSize: number = 24
): Promise<PaginatedCharacters> {
  const characters = await loadAllCharacters();
  const lowerQuery = query.toLowerCase();
  const filtered = characters.filter(char =>
    char.name.toLowerCase().includes(lowerQuery) ||
    char.biography.fullName.toLowerCase().includes(lowerQuery) ||
    char.biography.aliases.some(alias => alias.toLowerCase().includes(lowerQuery))
  );
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    characters: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}

/**
 * Get characters by their IDs with pagination
 */
export async function getCharactersByIdsPaginated(
  ids: number[],
  page: number = 1,
  pageSize: number = 24
): Promise<PaginatedCharacters> {
  if (ids.length === 0) {
    return {
      characters: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const characters = await loadAllCharacters();
  const idSet = new Set(ids);
  const filtered = characters.filter(char => idSet.has(char.id));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    characters: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}

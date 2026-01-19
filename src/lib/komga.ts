import { getSettings } from '@/actions/settings';

// Basic Types
type KomgaSeries = {
  id: string;
  name: string;
  metadata: {
    title: string;
    publisher: string;
    status: string;
  };
  booksCount: number;
};

type KomgaBook = {
  id: string;
  name: string;
  metadata: {
    number: string;
    releaseDate: string;
  };
  readProgress?: {
    completed: boolean;
  };
};

export async function getKomgaCredentials() {
  const settings = await getSettings();
  if (!settings?.komga_url) return null;
  
  // 🧹 SANITIZE INPUTS (The Fix)
  // We trim spaces to match the logic in the Test Connection button
  const user = (settings.komga_user || "").trim();
  const pass = (settings.komga_pass || "").trim();
  const url = settings.komga_url.trim().replace(/\/$/, "");

  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
  
  return {
    url,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json' // Ensure we request JSON
    }
  };
}

// 1. SEARCH SERIES
export async function searchKomgaSeries(title: string): Promise<KomgaSeries[]> {
  const creds = await getKomgaCredentials();
  if (!creds) return [];

  try {
    const res = await fetch(`${creds.url}/api/v1/series?search=${encodeURIComponent(title)}`, {
      headers: creds.headers,
      cache: 'no-store'
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    return data.content || [];
  } catch (error) {
    console.error("Komga Search Failed:", error);
    return [];
  }
}

// 2. GET BOOKS (With Loud Debugging)
export async function getKomgaBooks(seriesId: string): Promise<KomgaBook[]> {
  const creds = await getKomgaCredentials();
  if (!creds) return [];

  console.log(`📡 Fetching Books for ID: ${seriesId}`);

  try {
    const res = await fetch(`${creds.url}/api/v1/series/${seriesId}/books?size=500`, {
      headers: creds.headers,
      cache: 'no-store'
    });
    
    if (!res.ok) {
        console.error(`❌ Komga API Error: ${res.status} ${res.statusText}`);
        return [];
    }

    const data = await res.json();
    // Komga returns { content: [...], pageable: ... }
    return data.content || [];
  } catch (error) {
    console.error("❌ Network/Fetch Failed:", error);
    return [];
  }
}

// 3. GET SERIES (Paginated)
export async function getKomgaSeries(page: number = 0, size: number = 50): Promise<KomgaSeries[]> {
  const creds = await getKomgaCredentials();
  if (!creds) return [];

  try {
    const res = await fetch(`${creds.url}/api/v1/series?page=${page}&size=${size}`, {
      headers: creds.headers,
      cache: 'no-store'
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    return data.content || [];
  } catch (error) {
    console.error("Komga Series Fetch Failed:", error);
    return [];
  }
}

// 4. GET ALL SERIES (For Scanner)
export async function getAllKomgaSeries(): Promise<KomgaSeries[]> {
  const creds = await getKomgaCredentials();
  if (!creds) return [];

  try {
    const res = await fetch(`${creds.url}/api/v1/series?size=2000`, {
      headers: creds.headers
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    return data.content || [];
  } catch (error) {
    console.error("Komga Full Scan Failed:", error);
    return [];
  }
}

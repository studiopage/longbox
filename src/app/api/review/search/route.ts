import { NextRequest, NextResponse } from 'next/server';
import { searchComicVineForUI } from '@/utils/comicvine';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchComicVineForUI(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}



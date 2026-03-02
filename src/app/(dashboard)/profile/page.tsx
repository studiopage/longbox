import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/actions/auth';
import { ProfileClient } from './profile-client';
import { db } from '@/db';
import { read_progress, collections, readingList, favoriteSeries, favoriteCharacters } from '@/db/schema';
import { eq, sql, and, isNull, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const profile = await getUserProfile(session.user.id);

  if (!profile) {
    redirect('/login');
  }

  // Get user stats with backwards compatibility (include null user_id)
  const userId = session.user.id;

  const [
    booksReadResult,
    collectionsResult,
    readingListResult,
    favoriteSeriesResult,
    favoriteCharactersResult,
  ] = await Promise.all([
    // Books completed
    db
      .select({ count: sql<number>`count(*)` })
      .from(read_progress)
      .where(and(
        or(eq(read_progress.user_id, userId), isNull(read_progress.user_id)),
        eq(read_progress.is_completed, true)
      )),
    // Collections count
    db
      .select({ count: sql<number>`count(*)` })
      .from(collections)
      .where(or(eq(collections.user_id, userId), isNull(collections.user_id))),
    // Reading list count
    db
      .select({ count: sql<number>`count(*)` })
      .from(readingList)
      .where(or(eq(readingList.user_id, userId), isNull(readingList.user_id))),
    // Favorite series count
    db
      .select({ count: sql<number>`count(*)` })
      .from(favoriteSeries)
      .where(or(eq(favoriteSeries.user_id, userId), isNull(favoriteSeries.user_id))),
    // Favorite characters count
    db
      .select({ count: sql<number>`count(*)` })
      .from(favoriteCharacters)
      .where(or(eq(favoriteCharacters.user_id, userId), isNull(favoriteCharacters.user_id))),
  ]);

  const stats = {
    booksRead: booksReadResult[0]?.count ?? 0,
    collections: collectionsResult[0]?.count ?? 0,
    readingList: readingListResult[0]?.count ?? 0,
    favoriteSeries: favoriteSeriesResult[0]?.count ?? 0,
    favoriteCharacters: favoriteCharactersResult[0]?.count ?? 0,
  };

  return <ProfileClient profile={profile} stats={stats} />;
}

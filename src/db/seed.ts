import { db } from './index';
import { series, request, libraryMapping } from './schema';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create a Series (The "Truth")
  const batmanSeriesId = uuidv4();
  await db.insert(series).values({
    id: batmanSeriesId,
    title: 'Batman',
    start_year: 2016,
    publisher: 'DC Comics',
    description: 'The Rebirth era run of Batman.',
    status: 'ongoing',
    comicvine_id: '4050-91111',
  });

  // 2. Create a "Request" (The Action)
  await db.insert(request).values({
    id: uuidv4(),
    series_id: batmanSeriesId,
    edition: 'tpb',
    state: 'searching',
  });

  // 3. Create a Mapping (The "Batman Problem" Solver)
  await db.insert(libraryMapping).values({
    id: uuidv4(),
    komga_series_id: 'komga-batman-2016-001', // Mock Komga series ID
    local_title: 'Batman (2016)',
    komga_folder_path: '/komga/library/Batman (2016)', // Optional, for backward compatibility
    series_id: batmanSeriesId,
  });

  console.log('✅ Seeding complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});


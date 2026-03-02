import { db } from './index';
import { series, books, issues } from './schema';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('🌱 Seeding database...');

  // --- Series ---

  const batmanId = uuidv4();
  const spidermanId = uuidv4();
  const sagaId = uuidv4();
  const sandmanId = uuidv4();
  const xmenId = uuidv4();
  const immortalHulkId = uuidv4();
  const invincibleId = uuidv4();
  const swampThingId = uuidv4();

  await db.insert(series).values([
    {
      id: batmanId,
      name: 'Batman',
      year: 2016,
      publisher: 'DC Comics',
      description: 'The Rebirth era of Batman, written by Tom King. Bruce Wayne faces new challenges in Gotham City.',
      status: 'ended',
      cv_id: 91111,
    },
    {
      id: spidermanId,
      name: 'The Amazing Spider-Man',
      year: 2018,
      publisher: 'Marvel Comics',
      description: 'Nick Spencer\'s landmark run on Amazing Spider-Man. Peter Parker is back in the red and blue.',
      status: 'ended',
      cv_id: 112161,
    },
    {
      id: sagaId,
      name: 'Saga',
      year: 2012,
      publisher: 'Image Comics',
      description: 'An epic space opera/fantasy by Brian K. Vaughan and Fiona Staples about two lovers from warring alien races.',
      status: 'ongoing',
      cv_id: 43940,
    },
    {
      id: sandmanId,
      name: 'The Sandman',
      year: 1989,
      publisher: 'DC Comics / Vertigo',
      description: 'Neil Gaiman\'s masterpiece following Morpheus, the Lord of Dreams, and the Endless.',
      status: 'ended',
      cv_id: 3471,
    },
    {
      id: xmenId,
      name: 'X-Men',
      year: 2019,
      publisher: 'Marvel Comics',
      description: 'Jonathan Hickman\'s revolutionary relaunch of the X-Men, beginning with the Dawn of X era.',
      status: 'ended',
      cv_id: 124408,
    },
    {
      id: immortalHulkId,
      name: 'Immortal Hulk',
      year: 2018,
      publisher: 'Marvel Comics',
      description: 'Al Ewing\'s horror-driven reinvention of the Hulk. Bruce Banner cannot die — but he isn\'t always the one in control.',
      status: 'ended',
      cv_id: 110582,
    },
    {
      id: invincibleId,
      name: 'Invincible',
      year: 2003,
      publisher: 'Image Comics',
      description: 'Robert Kirkman\'s superhero epic following Mark Grayson, son of the most powerful hero on Earth.',
      status: 'ended',
      cv_id: 5646,
    },
    {
      id: swampThingId,
      name: 'Saga of the Swamp Thing',
      year: 1984,
      publisher: 'DC Comics',
      description: 'Alan Moore\'s genre-defining run on Swamp Thing that redefined horror comics.',
      status: 'ended',
      cv_id: 3610,
    },
  ]);

  console.log('✅ Inserted 8 series');

  // --- Books (physical files in library) ---

  const bookValues = [
    // Batman - 5 books
    ...Array.from({ length: 5 }, (_, i) => ({
      id: uuidv4(),
      series_id: batmanId,
      file_path: `/comics/Batman (2016)/Batman (2016) #${String(i + 1).padStart(3, '0')}.cbz`,
      file_size: 45_000_000 + Math.floor(Math.random() * 10_000_000),
      title: `Batman #${i + 1}`,
      number: String(i + 1).padStart(3, '0'),
      page_count: 24 + Math.floor(Math.random() * 8),
      publisher: 'DC Comics',
      authors: 'Tom King, David Finch',
    })),
    // Amazing Spider-Man - 4 books
    ...Array.from({ length: 4 }, (_, i) => ({
      id: uuidv4(),
      series_id: spidermanId,
      file_path: `/comics/Amazing Spider-Man (2018)/Amazing Spider-Man (2018) #${String(i + 1).padStart(3, '0')}.cbz`,
      file_size: 40_000_000 + Math.floor(Math.random() * 10_000_000),
      title: `The Amazing Spider-Man #${i + 1}`,
      number: String(i + 1).padStart(3, '0'),
      page_count: 22 + Math.floor(Math.random() * 6),
      publisher: 'Marvel Comics',
      authors: 'Nick Spencer, Ryan Ottley',
    })),
    // Saga - 6 books
    ...Array.from({ length: 6 }, (_, i) => ({
      id: uuidv4(),
      series_id: sagaId,
      file_path: `/comics/Saga/Saga #${String(i + 1).padStart(3, '0')}.cbz`,
      file_size: 35_000_000 + Math.floor(Math.random() * 10_000_000),
      title: `Saga #${i + 1}`,
      number: String(i + 1).padStart(3, '0'),
      page_count: 22,
      publisher: 'Image Comics',
      authors: 'Brian K. Vaughan, Fiona Staples',
    })),
    // Sandman - 4 books
    ...Array.from({ length: 4 }, (_, i) => ({
      id: uuidv4(),
      series_id: sandmanId,
      file_path: `/comics/Sandman/Sandman #${String(i + 1).padStart(3, '0')}.cbz`,
      file_size: 50_000_000 + Math.floor(Math.random() * 10_000_000),
      title: `The Sandman #${i + 1}`,
      number: String(i + 1).padStart(3, '0'),
      page_count: 24,
      publisher: 'DC Comics / Vertigo',
      authors: 'Neil Gaiman, Sam Kieth, Mike Dringenberg',
    })),
    // X-Men - 3 books
    ...Array.from({ length: 3 }, (_, i) => ({
      id: uuidv4(),
      series_id: xmenId,
      file_path: `/comics/X-Men (2019)/X-Men (2019) #${String(i + 1).padStart(3, '0')}.cbz`,
      file_size: 42_000_000 + Math.floor(Math.random() * 10_000_000),
      title: `X-Men #${i + 1}`,
      number: String(i + 1).padStart(3, '0'),
      page_count: 28,
      publisher: 'Marvel Comics',
      authors: 'Jonathan Hickman, Leinil Francis Yu',
    })),
    // Immortal Hulk - 5 books
    ...Array.from({ length: 5 }, (_, i) => ({
      id: uuidv4(),
      series_id: immortalHulkId,
      file_path: `/comics/Immortal Hulk/Immortal Hulk #${String(i + 1).padStart(3, '0')}.cbz`,
      file_size: 38_000_000 + Math.floor(Math.random() * 10_000_000),
      title: `Immortal Hulk #${i + 1}`,
      number: String(i + 1).padStart(3, '0'),
      page_count: 26,
      publisher: 'Marvel Comics',
      authors: 'Al Ewing, Joe Bennett',
    })),
    // Invincible - 4 books
    ...Array.from({ length: 4 }, (_, i) => ({
      id: uuidv4(),
      series_id: invincibleId,
      file_path: `/comics/Invincible/Invincible #${String(i + 1).padStart(3, '0')}.cbz`,
      file_size: 30_000_000 + Math.floor(Math.random() * 10_000_000),
      title: `Invincible #${i + 1}`,
      number: String(i + 1).padStart(3, '0'),
      page_count: 22,
      publisher: 'Image Comics',
      authors: 'Robert Kirkman, Cory Walker',
    })),
    // Swamp Thing - 3 books
    ...Array.from({ length: 3 }, (_, i) => ({
      id: uuidv4(),
      series_id: swampThingId,
      file_path: `/comics/Swamp Thing/Saga of the Swamp Thing #${String(i + 21).padStart(3, '0')}.cbz`,
      file_size: 32_000_000 + Math.floor(Math.random() * 10_000_000),
      title: `Saga of the Swamp Thing #${i + 21}`,
      number: String(i + 21).padStart(3, '0'),
      page_count: 24,
      publisher: 'DC Comics',
      authors: 'Alan Moore, Stephen Bissette, John Totleben',
    })),
  ];

  await db.insert(books).values(bookValues);
  console.log(`✅ Inserted ${bookValues.length} books`);

  // --- Issues (catalog entries for tracking) ---

  const issueValues = [
    // Batman issues 1-10
    ...Array.from({ length: 10 }, (_, i) => ({
      id: uuidv4(),
      series_id: batmanId,
      issue_number: String(i + 1),
      title: i === 0 ? 'I Am Gotham, Part One' : i === 1 ? 'I Am Gotham, Part Two' : undefined,
      status: i < 5 ? 'downloaded' : 'missing',
      cover_date: `2016-${String(7 + Math.floor(i / 2)).padStart(2, '0')}-01`,
    })),
    // Spider-Man issues 1-8
    ...Array.from({ length: 8 }, (_, i) => ({
      id: uuidv4(),
      series_id: spidermanId,
      issue_number: String(i + 1),
      title: i === 0 ? 'Back to Basics, Part One' : undefined,
      status: i < 4 ? 'downloaded' : 'wanted',
      cover_date: `2018-${String(7 + Math.floor(i / 2)).padStart(2, '0')}-01`,
    })),
    // Saga issues 1-6
    ...Array.from({ length: 6 }, (_, i) => ({
      id: uuidv4(),
      series_id: sagaId,
      issue_number: String(i + 1),
      status: 'downloaded',
      cover_date: `2012-${String(3 + i).padStart(2, '0')}-01`,
    })),
  ];

  await db.insert(issues).values(issueValues);
  console.log(`✅ Inserted ${issueValues.length} issues`);

  console.log('🎉 Seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

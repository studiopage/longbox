import { pgTable, uuid, varchar, integer, text, timestamp, pgEnum, real, boolean, serial, date, bigint, jsonb, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { SeriesStatus, EditionType, RequestState } from '@/types/longbox';
import type { AdapterAccountType } from 'next-auth/adapters';

// =====================
// AUTH TABLES (NextAuth.js)
// =====================

// Users table - Core user information
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  password: text('password'), // For credentials auth (hashed)
  role: text('role').default('user'), // 'user' | 'admin'

  // Profile settings
  displayName: text('display_name'),
  bio: text('bio'),

  // Reading preferences
  defaultReadMode: text('default_read_mode').default('standard'), // 'standard' | 'rtl' | 'webtoon'
  autoScroll: boolean('auto_scroll').default(false),
  defaultBrightness: integer('default_brightness').default(100),

  // UI preferences
  theme: text('theme').default('dark'), // 'dark' | 'light' | 'system'
  gridSize: text('grid_size').default('medium'), // 'small' | 'medium' | 'large'

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Accounts table - OAuth provider accounts
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccountType>().notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => ({
  providerIdx: uniqueIndex('provider_provider_account_id_idx').on(t.provider, t.providerAccountId),
}));

// Sessions table - Active user sessions
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// Verification tokens - For email verification
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}));

// Auth relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  collections: many(collections),
  readingList: many(readingList),
  favoriteCharacters: many(favoriteCharacters),
  favoriteSeries: many(favoriteSeries),
  readProgress: many(read_progress),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// =====================
// ENUMS
// =====================

// Enums
export const seriesStatusEnum = pgEnum('series_status', ['ongoing', 'ended', 'canceled']);
export const editionTypeEnum = pgEnum('edition_type', ['issue', 'tpb', 'omnibus']);
export const requestStateEnum = pgEnum('request_state', ['draft', 'requested', 'searching', 'fulfilled']);

// Series table - The "Truth" (Metadata from ComicVine/GCD)
// Series table - Unified table for both file-based and ComicVine series
export const series = pgTable('series', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // For the summary
  publisher: text('publisher'),
  year: integer('year'),
  status: text('status'), // "Continuing", "Ended", "ongoing", "ended", "canceled"
  thumbnail_url: text('thumbnail_url'),

  // External IDs
  cv_id: integer('cv_id'), // ComicVine ID
  metron_id: integer('metron_id'), // Metron ID
  goodreads_id: text('goodreads_id'),

  // Goodreads metrics
  goodreads_rating: real('goodreads_rating'), // 0-5 stars
  goodreads_rating_count: integer('goodreads_rating_count').default(0),

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Requests table - Unified wishlist/download queue
export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  series_id: uuid('series_id').references(() => series.id, { onDelete: 'cascade' }),
  issue_id: uuid('issue_id').references(() => issues.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  issue_number: text('issue_number'),
  publisher: text('publisher'),
  cv_id: integer('cv_id'),
  edition: editionTypeEnum('edition').default('issue'),
  status: requestStateEnum('status').default('draft'),
  webhook_sent: boolean('webhook_sent').default(false),
  requested_at: timestamp('requested_at').defaultNow(),
  fulfilled_at: timestamp('fulfilled_at'),
  created_at: timestamp('created_at').defaultNow(),
});


// Issues table - Individual Issues
export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  series_id: uuid('series_id').references(() => series.id, { onDelete: 'cascade' }),
  cv_id: integer('cv_id'), // ComicVine ID
  issue_number: text('issue_number').notNull(),
  title: text('title'),
  cover_date: date('cover_date'),
  thumbnail_url: text('thumbnail_url'),
  status: varchar('status', { length: 50 }).default('missing'), // 'missing', 'wanted', 'downloaded', 'archived'
  read: boolean('read').default(false),
  created_at: timestamp('created_at').defaultNow(),
});

// Relations
export const seriesRelations = relations(series, ({ many }) => ({
  books: many(books),
  requests: many(requests),
  issues: many(issues),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  user: one(users, { fields: [requests.user_id], references: [users.id] }),
  series: one(series, { fields: [requests.series_id], references: [series.id] }),
  issue: one(issues, { fields: [requests.issue_id], references: [issues.id] }),
}));


export const issuesRelations = relations(issues, ({ one, many }) => ({
  series: one(series, {
    fields: [issues.series_id],
    references: [series.id],
  }),
  requests: many(requests),
}));


// System Settings table - Singleton configuration store
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),

  // ComicVine
  cv_api_key: text('cv_api_key'),

  // Metron
  metron_username: text('metron_username'),
  metron_api_key: text('metron_api_key'),

  updated_at: timestamp('updated_at').defaultNow(),
});

// App Settings table - Key-value store for dynamic configuration
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Scan Jobs table - Persists scan state across restarts
export const scanJobs = pgTable('scan_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: text('status').notNull().default('idle'), // idle | running | completed | failed
  started_at: timestamp('started_at').defaultNow(),
  completed_at: timestamp('completed_at'),
  total_files: integer('total_files').default(0),
  processed_files: integer('processed_files').default(0),
  matched: integer('matched').default(0),
  needs_review: integer('needs_review').default(0),
  errors: integer('errors').default(0),
  current_file: text('current_file'),
});


// Books table - The Physical Files
export const books = pgTable('books', {
  id: uuid('id').defaultRandom().primaryKey(),
  series_id: uuid('series_id').references(() => series.id).notNull(),

  // File Info
  file_path: text('file_path').notNull().unique(),
  file_size: integer('file_size').notNull(),

  // Metadata
  title: text('title').notNull(),
  number: text('number'), // "001", "1", "Annual 1"
  page_count: integer('page_count').default(0),

  // Extended Metadata
  summary: text('summary'),
  publisher: text('publisher'),
  authors: text('authors'), // "Writer Name, Artist Name"
  published_date: timestamp('published_date'),

  // External IDs
  metron_id: integer('metron_id'), // Metron Issue ID
  goodreads_id: text('goodreads_id'),

  // ISBN/UPC identifiers
  isbn: text('isbn'),
  isbn13: text('isbn13'),
  upc: text('upc'),

  // Enrichment Data (from Metron/other sources)
  credits: jsonb('credits'), // [{creator: "Name", role: ["Writer"]}]
  story_arcs: jsonb('story_arcs'), // [{id: 1, name: "Arc Name"}]
  main_characters: jsonb('main_characters'), // [{name: "Character Name", id: 4005, url: "..."}]
  match_flags: text('match_flags').array(), // ["low_confidence", "needs_metadata"]

  // Goodreads metrics
  goodreads_rating: real('goodreads_rating'), // 0-5 stars
  goodreads_rating_count: integer('goodreads_rating_count').default(0),
  goodreads_reviews_count: integer('goodreads_reviews_count').default(0),

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Relations for books
export const booksRelations = relations(books, ({ one, many }) => ({
  series: one(series, {
    fields: [books.series_id],
    references: [series.id],
  }),
  readProgress: one(read_progress, {
    fields: [books.id],
    references: [read_progress.book_id],
  }),
  characters: many(book_characters),
}));

// Characters master table - Phase 2: Normalized character data
export const characters = pgTable('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  cv_id: integer('cv_id').unique(),
  metron_id: integer('metron_id'),
  name: text('name').notNull(),
  aliases: text('aliases').array(), // Alternative names
  description: text('description'),
  image_url: text('image_url'),
  publisher: text('publisher'),
  popularity_score: real('popularity_score').default(0),
  appearances_count: integer('appearances_count').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (t) => ({
  cvIdIdx: index('characters_cv_id_idx').on(t.cv_id),
  nameIdx: index('characters_name_idx').on(t.name),
}));

// Book-Character junction table - Phase 2: Many-to-many relationship
export const book_characters = pgTable('book_characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  book_id: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  character_id: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  role: text('role'),
  appearance_count: integer('appearance_count').default(1),
  is_main: boolean('is_main').default(false),
  created_at: timestamp('created_at').defaultNow(),
}, (t) => ({
  unique: uniqueIndex('unique_book_character').on(t.book_id, t.character_id),
  bookIdx: index('book_characters_book_id_idx').on(t.book_id),
  charIdx: index('book_characters_character_id_idx').on(t.character_id),
}));

// Relations for characters
export const charactersRelations = relations(characters, ({ many }) => ({
  books: many(book_characters),
}));

// Relations for book_characters
export const book_charactersRelations = relations(book_characters, ({ one }) => ({
  book: one(books, {
    fields: [book_characters.book_id],
    references: [books.id],
  }),
  character: one(characters, {
    fields: [book_characters.character_id],
    references: [characters.id],
  }),
}));

// Triage Queue table - Files awaiting manual series assignment
export const triageQueue = pgTable('triage_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  file_path: text('file_path').notNull().unique(),
  file_size: integer('file_size').notNull(),
  suggested_series: text('suggested_series'),
  suggested_title: text('suggested_title'),
  suggested_number: text('suggested_number'),
  match_confidence: real('match_confidence').default(0),
  matched_series_id: uuid('matched_series_id').references(() => series.id, { onDelete: 'set null' }),
  signals: jsonb('signals'),
  status: text('status').notNull().default('pending'), // pending | approved | rejected
  scan_job_id: uuid('scan_job_id').references(() => scanJobs.id, { onDelete: 'set null' }),
  metadata_xml: text('metadata_xml'),
  created_at: timestamp('created_at').defaultNow(),
});
// Read Progress table - Track reading progress per book per user
export const read_progress = pgTable('read_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Optional for backwards compat
  book_id: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  page: integer('page').notNull().default(1), // The page number
  is_completed: boolean('is_completed').default(false),
  updated_at: timestamp('updated_at').defaultNow(),
}, (t) => ({
  // Ensure we only have one progress record per book per user
  unique_user_book: uniqueIndex('unique_user_book_progress').on(t.user_id, t.book_id)
}));

// Relations for read_progress
export const readProgressRelations = relations(read_progress, ({ one }) => ({
  user: one(users, {
    fields: [read_progress.user_id],
    references: [users.id],
  }),
  book: one(books, {
    fields: [read_progress.book_id],
    references: [books.id],
  }),
}));


// Favorite Characters table - Track user's favorite superhero characters
export const favoriteCharacters = pgTable('favorite_characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Optional for backwards compat
  character_id: integer('character_id').notNull(), // SuperheroAPI character ID
  character_name: text('character_name').notNull(), // Cache name for quick display
  character_image: text('character_image'), // Cache image URL
  character_publisher: text('character_publisher'), // Cache publisher
  created_at: timestamp('created_at').defaultNow(),
}, (t) => ({
  unique_user_character: uniqueIndex('unique_user_favorite_character').on(t.user_id, t.character_id)
}));

// Favorite Series table - Track user's favorite series
export const favoriteSeries = pgTable('favorite_series', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Optional for backwards compat
  series_id: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow(),
}, (t) => ({
  unique_user_series: uniqueIndex('unique_user_favorite_series').on(t.user_id, t.series_id)
}));

// Collections table - User-created collections/folders for organizing comics
export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  cover_book_id: uuid('cover_book_id').references(() => books.id, { onDelete: 'set null' }),

  // Smart collection fields
  smart_rules: jsonb('smart_rules'),        // null = manual collection
  pinned: boolean('pinned').default(false),
  icon: text('icon'),                        // Lucide icon name
  sort_preference: text('sort_preference'),  // e.g. "title_asc", "date_added_desc"

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Collection Items table - Books in a collection
export const collectionItems = pgTable('collection_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  collection_id: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  book_id: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  sort_order: integer('sort_order').default(0),
  added_at: timestamp('added_at').defaultNow(),
}, (t) => ({
  unique_collection_book: uniqueIndex('unique_collection_book').on(t.collection_id, t.book_id)
}));// Reading List table - Queue of books to read
export const readingList = pgTable('reading_list', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Optional for backwards compat
  book_id: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  sort_order: integer('sort_order').default(0),
  added_at: timestamp('added_at').defaultNow(),
}, (t) => ({
  unique_user_reading_list_book: uniqueIndex('unique_user_reading_list_book').on(t.user_id, t.book_id)
}));

// =====================
// ACTIVITY EVENTS
// =====================

export const activityEvents = pgTable('activity_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  severity: text('severity').notNull().default('info'),
  created_at: timestamp('created_at').defaultNow(),
}, (t) => ({
  createdAtIdx: index('activity_events_created_at_idx').on(t.created_at),
  typeIdx: index('activity_events_type_idx').on(t.type),
}));

// Relations for collections
export const collectionsRelations = relations(collections, ({ many, one }) => ({
  user: one(users, {
    fields: [collections.user_id],
    references: [users.id],
  }),
  items: many(collectionItems),
  coverBook: one(books, {
    fields: [collections.cover_book_id],
    references: [books.id],
  }),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionItems.collection_id],
    references: [collections.id],
  }),
  book: one(books, {
    fields: [collectionItems.book_id],
    references: [books.id],
  }),
}));

export const readingListRelations = relations(readingList, ({ one }) => ({
  user: one(users, {
    fields: [readingList.user_id],
    references: [users.id],
  }),
  book: one(books, {
    fields: [readingList.book_id],
    references: [books.id],
  }),
}));

// Relations for favorites
export const favoriteCharactersRelations = relations(favoriteCharacters, ({ one }) => ({
  user: one(users, {
    fields: [favoriteCharacters.user_id],
    references: [users.id],
  }),
}));

// Book Reviews table - User ratings and notes per book
export const bookReviews = pgTable('book_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  book_id: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  rating: integer('rating'), // 1-5
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (t) => ({
  unique_user_book_review: uniqueIndex('unique_user_book_review').on(t.user_id, t.book_id),
}));

export const bookReviewsRelations = relations(bookReviews, ({ one }) => ({
  user: one(users, { fields: [bookReviews.user_id], references: [users.id] }),
  book: one(books, { fields: [bookReviews.book_id], references: [books.id] }),
}));

// Series Preferences table - Per-series reading preferences
export const seriesPreferences = pgTable('series_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  series_id: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  read_mode: text('read_mode'), // 'standard' | 'rtl' | 'webtoon'
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (t) => ({
  unique_user_series_pref: uniqueIndex('unique_user_series_pref').on(t.user_id, t.series_id),
}));

export const seriesPreferencesRelations = relations(seriesPreferences, ({ one }) => ({
  user: one(users, { fields: [seriesPreferences.user_id], references: [users.id] }),
  series: one(series, { fields: [seriesPreferences.series_id], references: [series.id] }),
}));

export const favoriteSeriesRelations = relations(favoriteSeries, ({ one }) => ({
  user: one(users, {
    fields: [favoriteSeries.user_id],
    references: [users.id],
  }),
  series: one(series, {
    fields: [favoriteSeries.series_id],
    references: [series.id],
  }),
}));

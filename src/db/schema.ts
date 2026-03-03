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

// Series Match Candidates - Tracks potential series matches from scanner
export const seriesMatchCandidates = pgTable('series_match_candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  local_title: text('local_title').notNull(),
  folder_path: text('folder_path'),
  series_id: uuid('series_id').references(() => series.id, { onDelete: 'set null' }),
  match_confidence: real('match_confidence').default(0),
  is_manually_verified: boolean('is_manually_verified').default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
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
  matchCandidates: many(seriesMatchCandidates),
  issues: many(issues),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  user: one(users, { fields: [requests.user_id], references: [users.id] }),
  series: one(series, { fields: [requests.series_id], references: [series.id] }),
  issue: one(issues, { fields: [requests.issue_id], references: [issues.id] }),
}));

export const seriesMatchCandidatesRelations = relations(seriesMatchCandidates, ({ one }) => ({
  series: one(series, {
    fields: [seriesMatchCandidates.series_id],
    references: [series.id],
  }),
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

  // Enrichment Data (from Metron/other sources)
  credits: jsonb('credits'), // [{creator: "Name", role: ["Writer"]}]
  story_arcs: jsonb('story_arcs'), // [{id: 1, name: "Arc Name"}]

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Relations for books
export const booksRelations = relations(books, ({ one }) => ({
  series: one(series, {
    fields: [books.series_id],
    references: [series.id],
  }),
  readProgress: one(read_progress, {
    fields: [books.id],
    references: [read_progress.book_id],
  }),
}));

// Import Queue table - Quarantine files from unknown series
export const importQueue = pgTable('import_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  file_path: text('file_path').notNull().unique(),
  file_size: integer('file_size').notNull(),
  
  // What the scanner thinks it is
  suggested_series: text('suggested_series'),
  suggested_title: text('suggested_title'),
  suggested_number: text('suggested_number'),
  
  // Metadata for later
  metadata_xml: text('metadata_xml'), // Store the raw XML JSON stringified
  
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
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Optional for backwards compat
  name: text('name').notNull(),
  description: text('description'),
  cover_book_id: uuid('cover_book_id').references(() => books.id, { onDelete: 'set null' }), // Use a book's cover as collection cover
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
}));export const favoriteSeriesRelations = relations(favoriteSeries, ({ one }) => ({
  user: one(users, {
    fields: [favoriteSeries.user_id],
    references: [users.id],
  }),
  series: one(series, {
    fields: [favoriteSeries.series_id],
    references: [series.id],
  }),
}));

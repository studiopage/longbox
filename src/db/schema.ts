import { pgTable, uuid, varchar, integer, text, timestamp, pgEnum, real, boolean, serial, date, bigint, jsonb, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { SeriesStatus, EditionType, RequestState } from '@/types/longbox';

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
  
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Request table - The "Request" (User Action)
export const request = pgTable('request', {
  id: uuid('id').primaryKey().defaultRandom(),
  series_id: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  edition: editionTypeEnum('edition').notNull(),
  state: requestStateEnum('state').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Library Mapping table - Handles the "Batman Problem"
// Links local Komga folders to Series via nullable foreign key
export const libraryMapping = pgTable('library_mapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  komga_series_id: text('komga_series_id').notNull().unique(),
  local_title: text('local_title').notNull(),
  komga_folder_path: text('komga_folder_path'), // Optional, for backward compatibility
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
  read: boolean('read').default(false), // Track reading progress from Komga
  created_at: timestamp('created_at').defaultNow(),
});

// Relations
export const seriesRelations = relations(series, ({ many }) => ({
  books: many(books),
  requests: many(request),
  libraryMappings: many(libraryMapping),
  issues: many(issues),
}));

export const requestRelations = relations(request, ({ one }) => ({
  series: one(series, {
    fields: [request.series_id],
    references: [series.id],
  }),
}));

export const libraryMappingRelations = relations(libraryMapping, ({ one }) => ({
  series: one(series, {
    fields: [libraryMapping.series_id],
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

// Requests table - The Active Queue (for Kapowarr)
export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  issue_id: uuid('issue_id').references(() => issues.id, { onDelete: 'cascade' }).notNull(),
  series_id: uuid('series_id').references(() => series.id, { onDelete: 'cascade' }).notNull(),
  
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'sent_to_kapowarr', 'failed'
  kapowarr_reference: text('kapowarr_reference'), // ID returned by Kapowarr
  
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// RELATIONS
export const requestsRelations = relations(requests, ({ one }) => ({
  issue: one(issues, { fields: [requests.issue_id], references: [issues.id] }),
  series: one(series, { fields: [requests.series_id], references: [series.id] }),
}));

// System Settings table - Singleton configuration store
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  
  // ComicVine
  cv_api_key: text('cv_api_key'),
  
  
  // Kapowarr
  kapowarr_url: text('kapowarr_url'),
  kapowarr_key: text('kapowarr_key'),

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
  
  // NEW COLUMNS (This is what was missing)
  summary: text('summary'),
  publisher: text('publisher'),
  authors: text('authors'), // "Writer Name, Artist Name"
  published_date: timestamp('published_date'),

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});


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
// Read Progress table - Track reading progress per book
export const read_progress = pgTable('read_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  book_id: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  page: integer('page').notNull().default(1), // The page number
  is_completed: boolean('is_completed').default(false),
  updated_at: timestamp('updated_at').defaultNow(),
}, (t) => ({
  // Ensure we only have one progress record per book
  unique_book: uniqueIndex('unique_book_progress').on(t.book_id)
}));

// Reading History table - Track user reading progress
export const readingHistory = pgTable('reading_history', {
  user_id: uuid('user_id').notNull(), // References auth.users(id) - handled by RLS
  book_id: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }),
  page: integer('page').default(1),
  completed: boolean('completed').default(false),
  read_date: timestamp('read_date', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.book_id] }),
}));


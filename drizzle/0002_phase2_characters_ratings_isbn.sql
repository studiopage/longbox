-- Phase 2: Character discovery, Goodreads ratings, ISBN/UPC tracking

-- 1. Characters master table (normalized character data)
CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id integer UNIQUE,
  metron_id integer,
  name text NOT NULL,
  aliases text[],        -- Alternative names for the character
  description text,
  image_url text,
  publisher text,        -- Primary publisher affiliation
  popularity_score real DEFAULT 0,  -- Popularity ranking (0-100)
  appearances_count integer DEFAULT 0,  -- Number of comic appearances
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS characters_cv_id_idx ON characters(cv_id);
CREATE INDEX IF NOT EXISTS characters_name_idx ON characters(name);

-- 2. Book-Character junction table (many-to-many)
CREATE TABLE IF NOT EXISTS book_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role text,                     -- "hero", "villain", "supporting", etc.
  appearance_count integer DEFAULT 1,
  is_main boolean DEFAULT false, -- Featured character
  created_at timestamp DEFAULT now(),
  UNIQUE(book_id, character_id)
);
CREATE INDEX IF NOT EXISTS book_characters_book_id_idx ON book_characters(book_id);
CREATE INDEX IF NOT EXISTS book_characters_character_id_idx ON book_characters(character_id);

-- 3. Goodreads rating fields on books
ALTER TABLE books ADD COLUMN IF NOT EXISTS goodreads_id text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS goodreads_rating real;      -- 0-5 stars
ALTER TABLE books ADD COLUMN IF NOT EXISTS goodreads_rating_count integer DEFAULT 0;
ALTER TABLE books ADD COLUMN IF NOT EXISTS goodreads_reviews_count integer DEFAULT 0;

-- 4. ISBN/UPC fields on books
ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn13 text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS upc text;

-- 5. Goodreads fields on series
ALTER TABLE series ADD COLUMN IF NOT EXISTS goodreads_id text;
ALTER TABLE series ADD COLUMN IF NOT EXISTS goodreads_rating real;
ALTER TABLE series ADD COLUMN IF NOT EXISTS goodreads_rating_count integer DEFAULT 0;

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS books_goodreads_id_idx ON books(goodreads_id);
CREATE INDEX IF NOT EXISTS books_isbn_idx ON books(isbn);
CREATE INDEX IF NOT EXISTS books_isbn13_idx ON books(isbn13);
CREATE INDEX IF NOT EXISTS series_goodreads_id_idx ON series(goodreads_id);

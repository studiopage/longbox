-- Phase 3: Story arc reading order engine + OCLC authority matching

-- 1. OCLC Authority Fields on Series
ALTER TABLE series ADD COLUMN IF NOT EXISTS oclc_number text;
ALTER TABLE series ADD COLUMN IF NOT EXISTS lccn text;           -- Library of Congress Control Number
ALTER TABLE series ADD COLUMN IF NOT EXISTS dewey_decimal text;  -- Dewey Decimal Classification

-- 2. OCLC Authority Fields on Books
ALTER TABLE books ADD COLUMN IF NOT EXISTS oclc_number text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS lccn text;

-- 3. Arc Reading Progress table - Track user progress through story arcs
CREATE TABLE IF NOT EXISTS arc_reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  arc_name text NOT NULL,                    -- Arc name from story_arcs jsonb
  total_issues integer DEFAULT 0,            -- Total issues in this arc
  issues_read integer DEFAULT 0,             -- Issues user has completed
  last_issue_read uuid REFERENCES books(id) ON DELETE SET NULL,
  arc_completion_pct real DEFAULT 0,         -- Calculated: (issues_read / total_issues) * 100
  started_at timestamp DEFAULT now(),
  completed_at timestamp,                    -- When user finished the arc
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(user_id, arc_name)
);

CREATE INDEX IF NOT EXISTS arc_reading_progress_user_id_idx ON arc_reading_progress(user_id);
CREATE INDEX IF NOT EXISTS arc_reading_progress_arc_name_idx ON arc_reading_progress(arc_name);
CREATE INDEX IF NOT EXISTS arc_reading_progress_completed_idx ON arc_reading_progress(completed_at) WHERE completed_at IS NULL;

-- 4. Arc reading order table - Tracks optimal reading order for each story arc
CREATE TABLE IF NOT EXISTS arc_reading_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_name text NOT NULL UNIQUE,              -- Story arc name
  book_ids uuid[] NOT NULL,                   -- Ordered array of book IDs for this arc
  issue_numbers text[] NOT NULL,              -- Corresponding issue numbers
  first_appearance_date date,                 -- When arc first appeared
  completion_date date,                       -- When arc concluded
  issue_count integer DEFAULT 0,              -- Total issues in arc
  series_ids uuid[] NOT NULL,                 -- Series IDs involved in this arc
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  -- Track data source for reading order
  source text DEFAULT 'auto',                 -- 'auto' (computed), 'metron', 'manual'
  confidence real DEFAULT 0                   -- Confidence score 0-100
);

CREATE INDEX IF NOT EXISTS arc_reading_orders_name_idx ON arc_reading_orders(arc_name);
CREATE INDEX IF NOT EXISTS arc_reading_orders_series_idx ON arc_reading_orders USING GIN(series_ids);

-- Create indexes for common lookups
CREATE INDEX IF NOT EXISTS series_oclc_number_idx ON series(oclc_number);
CREATE INDEX IF NOT EXISTS books_oclc_number_idx ON books(oclc_number);

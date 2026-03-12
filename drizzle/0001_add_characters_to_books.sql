-- Add main_characters field to books table for Phase 1: Character data integration
ALTER TABLE books ADD COLUMN IF NOT EXISTS main_characters jsonb;
CREATE INDEX IF NOT EXISTS books_main_characters_idx ON books USING GIN(main_characters);

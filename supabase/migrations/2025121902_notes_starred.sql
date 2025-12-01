-- Migration: Add is_starred column to notes for pinning favorites
-- Pattern: Idempotent (safe to re-run)

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'is_starred'
  ) THEN
    ALTER TABLE notes ADD COLUMN is_starred boolean DEFAULT false;
  END IF;
END $$;

-- Create index for starred notes queries
CREATE INDEX IF NOT EXISTS idx_notes_starred ON notes(is_starred) WHERE is_starred = true;

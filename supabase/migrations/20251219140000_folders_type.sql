-- Migration: Add folder_type to distinguish AI conversation folders from notebook folders
-- Pattern: Idempotent (safe to re-run)

-- Add folder_type column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'folders' AND column_name = 'folder_type'
  ) THEN
    ALTER TABLE folders ADD COLUMN folder_type text DEFAULT 'notebook';
  END IF;
END $$;

-- Create index for folder_type queries
CREATE INDEX IF NOT EXISTS idx_folders_type ON folders(folder_type);

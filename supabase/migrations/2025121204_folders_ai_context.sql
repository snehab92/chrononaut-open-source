-- Migration: Folders and AI Context system for Notes
-- Pattern: Idempotent (safe to re-run)

-- ============================================
-- FOLDERS (hierarchical organization)
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add folder_id to notes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE notes ADD COLUMN folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- AI CONTEXT COLLECTIONS ("About Me" folders)
-- ============================================
-- Collections group notes for AI agent context
CREATE TABLE IF NOT EXISTS ai_context_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Junction table: which notes belong to which context collections
CREATE TABLE IF NOT EXISTS ai_context_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES ai_context_collections(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  
  UNIQUE(collection_id, note_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_collections_user ON ai_context_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_notes_collection ON ai_context_notes(collection_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_notes_note ON ai_context_notes(note_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own folders" ON folders;
CREATE POLICY "Users can manage own folders" 
  ON folders FOR ALL 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own ai_context_collections" ON ai_context_collections;
CREATE POLICY "Users can manage own ai_context_collections" 
  ON ai_context_collections FOR ALL 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own ai_context_notes" ON ai_context_notes;
CREATE POLICY "Users can manage own ai_context_notes" 
  ON ai_context_notes FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM ai_context_collections c 
      WHERE c.id = ai_context_notes.collection_id 
      AND c.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS folders_updated_at ON folders;
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS ai_context_collections_updated_at ON ai_context_collections;
CREATE TRIGGER ai_context_collections_updated_at
  BEFORE UPDATE ON ai_context_collections
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

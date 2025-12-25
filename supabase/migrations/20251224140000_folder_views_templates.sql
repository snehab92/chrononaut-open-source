-- Migration: Add folder_views and folder_templates tables for Notion-like folder display
-- Pattern: Idempotent (safe to re-run)

-- ============================================================================
-- Table: folder_views
-- Stores named views per folder with configuration (database, kanban, gallery)
-- ============================================================================

CREATE TABLE IF NOT EXISTS folder_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default View',
  view_type text NOT NULL DEFAULT 'database' CHECK (view_type IN ('database', 'kanban', 'gallery')),
  config jsonb NOT NULL DEFAULT '{
    "sortField": "updated_at",
    "sortDirection": "desc",
    "groupByField": null,
    "filters": [],
    "visibleColumns": ["title", "note_type", "tags", "is_starred", "updated_at"]
  }'::jsonb,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for folder_views
CREATE INDEX IF NOT EXISTS idx_folder_views_folder ON folder_views(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_views_user ON folder_views(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_views_default ON folder_views(folder_id, is_default) WHERE is_default = true;

-- RLS for folder_views
ALTER TABLE folder_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own folder_views" ON folder_views;
CREATE POLICY "Users can manage own folder_views"
  ON folder_views FOR ALL
  USING (auth.uid() = user_id);

-- Updated_at trigger for folder_views
DROP TRIGGER IF EXISTS folder_views_updated_at ON folder_views;
CREATE TRIGGER folder_views_updated_at
  BEFORE UPDATE ON folder_views
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- Table: folder_templates
-- Stores templates per folder for creating new notes
-- ============================================================================

CREATE TABLE IF NOT EXISTS folder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Template',
  default_content text,
  default_note_type text DEFAULT 'document',
  default_label text,
  ai_prompt text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for folder_templates
CREATE INDEX IF NOT EXISTS idx_folder_templates_folder ON folder_templates(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_templates_user ON folder_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_templates_active ON folder_templates(folder_id, is_active) WHERE is_active = true;

-- RLS for folder_templates
ALTER TABLE folder_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own folder_templates" ON folder_templates;
CREATE POLICY "Users can manage own folder_templates"
  ON folder_templates FOR ALL
  USING (auth.uid() = user_id);

-- Updated_at trigger for folder_templates
DROP TRIGGER IF EXISTS folder_templates_updated_at ON folder_templates;
CREATE TRIGGER folder_templates_updated_at
  BEFORE UPDATE ON folder_templates
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

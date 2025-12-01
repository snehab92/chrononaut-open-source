-- About Me Files table for AI context
-- Files uploaded here are used as context for AI agents
-- Similar to Claude.ai project files

CREATE TABLE IF NOT EXISTS about_me_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'xlsx', 'markdown', 'txt')),
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  -- Category for organization
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('assessments', 'feedback', 'inspiration', 'research', 'general')),
  -- Which agents can access this file (empty = all agents)
  agent_access TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Optional description
  description TEXT,
  -- Extracted text content for AI context (stored for efficiency)
  extracted_content TEXT,
  -- For growth metrics - links to assessment types
  is_assessment BOOLEAN DEFAULT false,
  assessment_type TEXT CHECK (assessment_type IN ('self_compassion', 'values_alignment', 'executive_function', 'strengths')),
  assessment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent instructions table - custom instructions per agent
CREATE TABLE IF NOT EXISTS agent_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('executive-coach', 'research-assistant', 'therapist', 'pattern-analyst')),
  instructions TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_about_me_files_user ON about_me_files(user_id);
CREATE INDEX IF NOT EXISTS idx_about_me_files_category ON about_me_files(user_id, category);
CREATE INDEX IF NOT EXISTS idx_about_me_files_agents ON about_me_files USING GIN(agent_access);
CREATE INDEX IF NOT EXISTS idx_agent_instructions_user ON agent_instructions(user_id, agent_type);

-- RLS
ALTER TABLE about_me_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_instructions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own about me files" ON about_me_files;
CREATE POLICY "Users can manage their own about me files" ON about_me_files
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own agent instructions" ON agent_instructions;
CREATE POLICY "Users can manage their own agent instructions" ON agent_instructions
  FOR ALL USING (auth.uid() = user_id);

-- Updated at trigger (may already exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_about_me_files_updated_at ON about_me_files;
CREATE TRIGGER update_about_me_files_updated_at
    BEFORE UPDATE ON about_me_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_instructions_updated_at ON agent_instructions;
CREATE TRIGGER update_agent_instructions_updated_at
    BEFORE UPDATE ON agent_instructions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

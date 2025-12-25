-- Add extracted_insights column to about_me_files for caching AI-extracted assessment insights

ALTER TABLE about_me_files
ADD COLUMN IF NOT EXISTS extracted_insights jsonb;

-- Add index for faster queries on assessment type
CREATE INDEX IF NOT EXISTS idx_about_me_files_assessment
ON about_me_files (user_id, is_assessment, assessment_type)
WHERE is_assessment = true;

COMMENT ON COLUMN about_me_files.extracted_insights IS 'AI-extracted insights from assessment files (cached)';

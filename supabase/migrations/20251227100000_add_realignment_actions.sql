-- Add realignment_actions column to values_alignment_results
-- These are positive actions to take when warning signs appear

ALTER TABLE values_alignment_results
ADD COLUMN IF NOT EXISTS realignment_actions text[] DEFAULT '{}';

COMMENT ON COLUMN values_alignment_results.realignment_actions IS 'Actions to take when warning signs appear to get back on track with values';

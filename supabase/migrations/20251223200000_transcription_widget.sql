-- ============================================
-- TRANSCRIPTION WIDGET SUPPORT
-- ============================================
-- Adds real-time transcription capabilities with speaker diarization
-- to the meeting_notes table

-- Add transcription session state fields
ALTER TABLE public.meeting_notes
ADD COLUMN IF NOT EXISTS transcription_status text DEFAULT 'idle'
  CHECK (transcription_status IN ('idle', 'recording', 'paused', 'completed'));

ALTER TABLE public.meeting_notes
ADD COLUMN IF NOT EXISTS transcription_started_at timestamp with time zone;

ALTER TABLE public.meeting_notes
ADD COLUMN IF NOT EXISTS transcription_ended_at timestamp with time zone;

ALTER TABLE public.meeting_notes
ADD COLUMN IF NOT EXISTS transcription_duration_seconds integer DEFAULT 0;

-- Speaker mapping: maps speaker IDs to names (e.g., {"0": "Alice", "1": "Guest"})
ALTER TABLE public.meeting_notes
ADD COLUMN IF NOT EXISTS speaker_map jsonb DEFAULT '{}';

-- Transcript segments: array of segments with timestamps and speaker IDs
-- Each segment structure: { text, start, end, speaker, speakerLabel }
ALTER TABLE public.meeting_notes
ADD COLUMN IF NOT EXISTS transcript_segments jsonb DEFAULT '[]';

-- Index for finding active transcription sessions
CREATE INDEX IF NOT EXISTS idx_meeting_notes_transcription_status
ON public.meeting_notes(transcription_status)
WHERE transcription_status != 'idle';

-- Comment for documentation
COMMENT ON COLUMN public.meeting_notes.transcription_status IS 'Current state: idle, recording, paused, completed';
COMMENT ON COLUMN public.meeting_notes.speaker_map IS 'Maps speaker IDs to display names for diarization';
COMMENT ON COLUMN public.meeting_notes.transcript_segments IS 'Array of transcript segments with speaker and timing info';

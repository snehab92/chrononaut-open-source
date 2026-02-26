-- Add external list/section name columns to tasks
-- Allows displaying the project/list and section information in the UI

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS external_list_name text,
ADD COLUMN IF NOT EXISTS external_section_name text;

-- Documentation
COMMENT ON COLUMN public.tasks.external_list_name IS 'Name of the external list/project for display purposes';
COMMENT ON COLUMN public.tasks.external_section_name IS 'Name of the section within the list for display purposes';

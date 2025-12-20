-- Add TickTick list name and section name to tasks
-- This allows displaying the project/list and section information in the UI

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS ticktick_list_name text,
ADD COLUMN IF NOT EXISTS ticktick_section_name text;

-- Comment for documentation
COMMENT ON COLUMN public.tasks.ticktick_list_name IS 'Name of the TickTick list/project (e.g., "Projects", "Health & Beauty")';
COMMENT ON COLUMN public.tasks.ticktick_section_name IS 'Name of the section within the list (e.g., "Build Second Brain App", "Wardrobe")';

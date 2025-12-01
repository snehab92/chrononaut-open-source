-- Storage RLS policies for about-me-files bucket
-- Bucket must be created manually in Supabase Dashboard first (Storage → New Bucket → "about-me-files" → Private)

CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'about-me-files' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'about-me-files' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'about-me-files' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

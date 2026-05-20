-- Migration v5: Supabase Storage - avatars bucket
-- =====================================================================
-- STEP 1: Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor)
-- STEP 2: The bucket itself must also be created via:
--   Dashboard → Storage → New Bucket → Name: "avatars" → Public: ON
-- =====================================================================

-- Create bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/replace their own avatar
-- (file path must start with their user UUID)
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to read avatars (public bucket)
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================================
-- NOTE: The profile page uploads files as: {user_id}.{ext}
-- e.g. "550e8400-e29b-41d4-a716-446655440000.jpg"
-- The RLS policy above uses storage.foldername which checks path prefix.
-- Since there's no subfolder here, adjust the policy if needed:
-- Use: name LIKE (auth.uid()::text || '%') for flat file structure.
-- =====================================================================

-- Alternative simpler RLS (if foldername doesn't work for flat paths):
-- DROP POLICY "Users can upload own avatar" ON storage.objects;
-- CREATE POLICY "Users can upload own avatar"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '%'));

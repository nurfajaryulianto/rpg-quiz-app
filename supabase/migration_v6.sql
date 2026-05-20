-- Migration v6: Fix avatars bucket RLS policies
-- =====================================================================
-- The v5 migration used storage.foldername() which only works for files
-- stored in sub-folders (e.g. "uuid/avatar.jpg").
-- Our profile page stores files at the root: "{user_id}.jpg" (flat path).
-- storage.foldername("{uuid}.jpg") returns {} so [1] is NULL → RLS always fails.
--
-- This migration drops the broken policies and recreates them with the
-- correct flat-path check: name LIKE (auth.uid()::text || '.%')
-- =====================================================================

-- Drop broken policies from v5
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Recreate INSERT policy with flat path check
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE (auth.uid()::text || '.%')
);

-- Recreate UPDATE policy with flat path check
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE (auth.uid()::text || '.%')
);

-- Recreate DELETE policy with flat path check
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE (auth.uid()::text || '.%')
);

-- The SELECT policy from v5 is still correct (no path check needed for public read):
-- "Avatars are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'avatars')
-- No need to recreate it.

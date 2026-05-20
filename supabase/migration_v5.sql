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
-- Files are stored flat: "{user_id}.{ext}" (e.g. "uuid.jpg")
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload own avatar') THEN
    CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND name LIKE (auth.uid()::text || '.%')
    );
  END IF;
END $$;

-- Allow anyone to read avatars (public bucket)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Avatars are publicly readable') THEN
    CREATE POLICY "Avatars are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Allow users to update their own avatar
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update own avatar') THEN
    CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND name LIKE (auth.uid()::text || '.%')
    );
  END IF;
END $$;

-- Allow users to delete their own avatar
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete own avatar') THEN
    CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND name LIKE (auth.uid()::text || '.%')
    );
  END IF;
END $$;

-- =====================================================================
-- NOTE: Files are stored as: {user_id}.{ext} (flat, no subfolder)
-- e.g. "550e8400-e29b-41d4-a716-446655440000.jpg"
-- The LIKE check ensures each user can only manage their own file.
-- If you already ran the broken v5 policies, run migration_v6.sql instead.
-- =====================================================================

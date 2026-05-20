-- Migration v7: Add jabatan + sub_dept to participants
-- =====================================================================
-- These fields are needed for the Google Sheets results export format
-- =====================================================================

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS jabatan TEXT,
  ADD COLUMN IF NOT EXISTS sub_dept TEXT;

CREATE INDEX IF NOT EXISTS idx_participants_jabatan ON public.participants(jabatan);
CREATE INDEX IF NOT EXISTS idx_participants_sub_dept ON public.participants(sub_dept);

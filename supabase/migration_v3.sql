-- ============================================================
-- MIGRATION V3: Full Assessment Overhaul
-- Run AFTER migration_v2.sql in Supabase SQL Editor
-- ============================================================

-- ----------------------------------------
-- 1. PARTICIPANTS: area + supervisor role
-- ----------------------------------------
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS area TEXT;

ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_role_check;
ALTER TABLE public.participants
  ADD CONSTRAINT participants_role_check
    CHECK (role IN ('participant', 'supervisor', 'admin'));

CREATE INDEX IF NOT EXISTS idx_participants_area ON public.participants(area);

-- ----------------------------------------
-- 2. BATCHES: assessment settings
-- ----------------------------------------
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS passing_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkbox_options_count INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS show_results BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_answers_analysis BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS working_hours_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_before_start BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------
-- 3. QUESTIONS: new types
-- ----------------------------------------
ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_question_type_check
    CHECK (question_type IN ('multiple_choice', 'true_false', 'binary', 'checkbox', 'essay'));

-- ----------------------------------------
-- 4. OPTIONS: remove restrictive label CHECK
--    (binary uses "Ya"/"Tidak", essay has no options)
-- ----------------------------------------
ALTER TABLE public.options
  DROP CONSTRAINT IF EXISTS options_option_label_check;

-- option_label is now free text — keep the column for display purposes
ALTER TABLE public.options
  ALTER COLUMN option_label SET DEFAULT 'A';

-- ----------------------------------------
-- 5. ANSWERS: multi-type answer support
-- ----------------------------------------
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS essay_text TEXT,
  ADD COLUMN IF NOT EXISTS selected_option_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS essay_graded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS graded_score INTEGER,
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.participants(id),
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

-- ----------------------------------------
-- 6. EXAM_SESSIONS: attempt tracking
-- ----------------------------------------
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_leaderboard_eligible BOOLEAN NOT NULL DEFAULT true;

-- Drop the old unique(participant_id, batch_id) constraint
ALTER TABLE public.exam_sessions
  DROP CONSTRAINT IF EXISTS exam_sessions_participant_id_batch_id_key;

-- New constraint: unique per participant + batch + attempt number
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_sessions_participant_batch_attempt_key'
  ) THEN
    ALTER TABLE public.exam_sessions
      ADD CONSTRAINT exam_sessions_participant_batch_attempt_key
        UNIQUE(participant_id, batch_id, attempt_number);
  END IF;
END $$;

-- ----------------------------------------
-- 7. INDEXES
-- ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_answers_essay_graded
  ON public.answers(essay_graded)
  WHERE essay_graded = false;

CREATE INDEX IF NOT EXISTS idx_answers_graded_by
  ON public.answers(graded_by);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_leaderboard
  ON public.exam_sessions(is_leaderboard_eligible, batch_id)
  WHERE is_leaderboard_eligible = true;

CREATE INDEX IF NOT EXISTS idx_exam_sessions_attempt
  ON public.exam_sessions(participant_id, batch_id, attempt_number);

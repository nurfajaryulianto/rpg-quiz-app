-- ============================================================
-- MIGRATION V2: Assessment Enhancements
-- Run this in the Supabase SQL Editor AFTER the base schema
-- ============================================================

-- ----------------------------------------
-- 1. QUESTIONS: add category + difficulty
-- ----------------------------------------
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium';

-- Drop old question_type constraint and widen to include true_false
ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_question_type_check
    CHECK (question_type IN ('multiple_choice', 'true_false'));

-- Add difficulty constraint
ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_difficulty_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_difficulty_check
    CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- ----------------------------------------
-- 2. BATCHES: add randomize_questions
-- ----------------------------------------
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------
-- 3. ANSWERS: track time spent per question
-- ----------------------------------------
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER NOT NULL DEFAULT 0;

-- ----------------------------------------
-- 4. EXAM_SESSIONS: persist question order per participant
-- ----------------------------------------
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS question_order JSONB;

-- ----------------------------------------
-- 5. INDEX: faster per-question analytics
-- ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);

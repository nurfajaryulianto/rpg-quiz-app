-- RPG Quiz App - Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PARTICIPANTS
-- ============================================
CREATE TABLE public.participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'admin')),
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  quizzes_taken INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participants_user_id ON public.participants(user_id);
CREATE INDEX idx_participants_email ON public.participants(email);
CREATE INDEX idx_participants_role ON public.participants(role);

-- ============================================
-- BATCHES (Quiz Sessions)
-- ============================================
CREATE TABLE public.batches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  time_limit_seconds INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_by UUID REFERENCES public.participants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_batches_is_active ON public.batches(is_active);

-- ============================================
-- QUESTIONS
-- ============================================
CREATE TABLE public.questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice')),
  points INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_batch_id ON public.questions(batch_id);

-- ============================================
-- OPTIONS (Answer Choices)
-- ============================================
CREATE TABLE public.options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  option_label TEXT NOT NULL DEFAULT 'A' CHECK (option_label IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_options_question_id ON public.options(question_id);

-- ============================================
-- ANSWERS (Participant Responses)
-- ============================================
CREATE TABLE public.answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.options(id),
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  streak_count INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, question_id)
);

CREATE INDEX idx_answers_participant_id ON public.answers(participant_id);
CREATE INDEX idx_answers_batch_id ON public.answers(batch_id);
CREATE INDEX idx_answers_participant_batch ON public.answers(participant_id, batch_id);

-- ============================================
-- EXAM SESSIONS (Track quiz attempts)
-- ============================================
CREATE TABLE public.exam_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'timed_out')),
  score INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  UNIQUE(participant_id, batch_id)
);

CREATE INDEX idx_exam_sessions_participant ON public.exam_sessions(participant_id);
CREATE INDEX idx_exam_sessions_batch ON public.exam_sessions(batch_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Participants
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all participants"
  ON public.participants FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can insert participants"
  ON public.participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR NOT EXISTS (SELECT 1 FROM public.participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can delete participants"
  ON public.participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Batches
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active batches"
  ON public.batches FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage batches"
  ON public.batches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view questions of active batches"
  ON public.questions FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage questions"
  ON public.questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Options
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view options"
  ON public.options FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage options"
  ON public.options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Answers
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers"
  ON public.answers FOR SELECT
  USING (
    participant_id IN (
      SELECT id FROM public.participants WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert own answers"
  ON public.answers FOR INSERT
  WITH CHECK (
    participant_id IN (
      SELECT id FROM public.participants WHERE user_id = auth.uid()
    )
  );

-- Exam Sessions
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam sessions"
  ON public.exam_sessions FOR SELECT
  USING (
    participant_id IN (
      SELECT id FROM public.participants WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can manage own exam sessions"
  ON public.exam_sessions FOR INSERT
  WITH CHECK (
    participant_id IN (
      SELECT id FROM public.participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own exam sessions"
  ON public.exam_sessions FOR UPDATE
  USING (
    participant_id IN (
      SELECT id FROM public.participants WHERE user_id = auth.uid()
    )
  );


-- pass: E8RUL9Br4n2rGkMG
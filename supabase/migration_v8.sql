-- Migration v8: Single-Device Login + Supervisor Improvements
-- =====================================================================
-- Run this in the Supabase SQL Editor
-- =====================================================================

-- ──────────────────────────────────────────────────────────────────
-- 1. Single-device session nonce
--    A UUID written to DB on every login.  Supabase Realtime propagates
--    the change; any other logged-in device that holds a different nonce
--    immediately signs itself out.
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS current_session_id TEXT;

-- ──────────────────────────────────────────────────────────────────
-- 2. Fix answers SELECT RLS
--    Current policy only allows users to see their OWN answers.
--    Supervisors need to see ALL essay answers (to grade them).
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own answers" ON public.answers;

CREATE POLICY "Users can view answers"
  ON public.answers FOR SELECT
  USING (
    -- own answers
    participant_id IN (
      SELECT id FROM public.participants WHERE user_id = auth.uid()
    )
    -- or supervisor / admin sees all
    OR EXISTS (
      SELECT 1 FROM public.participants
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'supervisor')
    )
  );

-- ──────────────────────────────────────────────────────────────────
-- 3. grade_essay_answer() — SECURITY DEFINER function
--
--    Bundles the three operations that grading requires:
--      a) UPDATE answers  (sets essay_graded, graded_score, etc.)
--      b) UPDATE exam_sessions  (recalculates final score)
--      c) UPDATE participants  (syncs cumulative total_score)
--    All three bypass RLS via SECURITY DEFINER, but the function
--    first verifies the caller is a supervisor or admin.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION grade_essay_answer(
  p_answer_id  UUID,
  p_score      INTEGER,
  p_graded_by  UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant_id      UUID;
  v_batch_id            UUID;
  v_old_session_score   INTEGER;
  v_new_session_score   INTEGER;
BEGIN
  -- ── Security gate ──────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM participants
    WHERE user_id = auth.uid()
      AND role IN ('supervisor', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: grading requires supervisor or admin role';
  END IF;

  -- ── (a) Update the answer row ───────────────────────────────────
  UPDATE answers
  SET
    essay_graded  = true,
    graded_score  = p_score,
    points_earned = p_score,
    is_correct    = (p_score > 0),
    graded_by     = p_graded_by,
    graded_at     = NOW()
  WHERE id = p_answer_id
  RETURNING participant_id, batch_id
  INTO v_participant_id, v_batch_id;

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Answer not found: %', p_answer_id;
  END IF;

  -- ── (b) Snapshot old session score before recalculation ─────────
  SELECT COALESCE(score, 0)
  INTO v_old_session_score
  FROM exam_sessions
  WHERE participant_id = v_participant_id
    AND batch_id       = v_batch_id
    AND status IN ('completed', 'timed_out')
  ORDER BY attempt_number DESC
  LIMIT 1;

  -- Recalculate from all answers for this participant+batch
  SELECT COALESCE(SUM(points_earned), 0)
  INTO v_new_session_score
  FROM answers
  WHERE participant_id = v_participant_id
    AND batch_id       = v_batch_id;

  -- Update exam session final score
  UPDATE exam_sessions
  SET score = v_new_session_score
  WHERE participant_id = v_participant_id
    AND batch_id       = v_batch_id
    AND status IN ('completed', 'timed_out');

  -- ── (c) Propagate score delta to participant cumulative total ────
  UPDATE participants
  SET total_score = GREATEST(0, total_score + (v_new_session_score - v_old_session_score))
  WHERE id = v_participant_id;
END;
$$;

-- Allow any authenticated user to call the function;
-- the role check inside the function is the real gate.
GRANT EXECUTE ON FUNCTION grade_essay_answer(UUID, INTEGER, UUID) TO authenticated;

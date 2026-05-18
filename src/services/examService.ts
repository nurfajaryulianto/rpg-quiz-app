import { supabase } from "@/lib/supabase";
import type { QuestionWithOptions, ExamSession, Batch } from "@/lib/database.types";
import { shuffleArray, calculateXP, calculateScore } from "@/utils/gamification";

/**
 * Validate that the current time is within the batch's access window.
 * Throws a user-friendly error if the batch cannot be accessed right now.
 */
export function assertBatchAccessible(batch: Batch): void {
  const now = new Date();
  const nowMs = now.getTime();

  if (!batch.is_active) {
    throw new Error("This quest is not currently active.");
  }

  if (batch.start_time) {
    const start = new Date(batch.start_time).getTime();
    if (nowMs < start) {
      const diff = Math.ceil((start - nowMs) / 60000);
      throw new Error(
        `This exam hasn't started yet. It opens in ${diff} minute${diff !== 1 ? "s" : ""}.`
      );
    }
  }

  if (batch.end_time) {
    const end = new Date(batch.end_time).getTime();
    if (nowMs > end) {
      throw new Error("The exam window for this quest has closed.");
    }
  }

  // Working-hours gate (browser local time: Mon–Fri 07:00–16:00)
  if (batch.working_hours_only) {
    const day = now.getDay(); // 0=Sun, 6=Sat
    const minutesFromMidnight = now.getHours() * 60 + now.getMinutes();
    const isWeekday = day >= 1 && day <= 5;
    const isWorkingHours = minutesFromMidnight >= 7 * 60 && minutesFromMidnight < 16 * 60;
    if (!isWeekday || !isWorkingHours) {
      throw new Error(
        "This exam is only accessible during working hours (Monday–Friday, 07:00–16:00)."
      );
    }
  }
}

/**
 * Fetch questions for a batch, respecting the stored question_order (for randomisation).
 * Options for single-choice questions are always shuffled per-request.
 * Essay questions have no options.
 */
export async function fetchExamQuestions(
  batchId: string,
  questionOrder: string[] | null
): Promise<QuestionWithOptions[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*, options(*)")
    .eq("batch_id", batchId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("No questions found for this batch");

  let questions = data as QuestionWithOptions[];

  // Apply per-participant question order if present
  if (questionOrder && questionOrder.length > 0) {
    const orderMap = new Map(questionOrder.map((id, idx) => [id, idx]));
    questions = [...questions].sort(
      (a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999)
    );
  }

  // Shuffle options for single-choice types only
  return questions.map((q) => ({
    ...q,
    options:
      q.question_type === "essay" ? q.options : shuffleArray(q.options),
  }));
}

/**
 * Start (or resume) an exam session.
 * Respects max_attempts: throws if the participant has exhausted their attempts.
 * Sets attempt_number and is_leaderboard_eligible automatically.
 */
export async function startExamSession(
  participantId: string,
  batchId: string,
  batch: Batch
): Promise<ExamSession> {
  // Fetch all existing sessions for this participant + batch
  const { data: sessions, error: fetchError } = await supabase
    .from("exam_sessions")
    .select("*")
    .eq("participant_id", participantId)
    .eq("batch_id", batchId)
    .order("attempt_number", { ascending: true });

  if (fetchError) throw fetchError;

  const allSessions = (sessions ?? []) as ExamSession[];

  // Resume any in-progress session
  const inProgress = allSessions.find((s) => s.status === "in_progress");
  if (inProgress) return inProgress;

  // Count completed/timed-out sessions = past attempts
  const completedCount = allSessions.filter(
    (s) => s.status === "completed" || s.status === "timed_out"
  ).length;

  const maxAttempts = batch.max_attempts ?? 1;
  if (completedCount >= maxAttempts) {
    throw new Error(
      maxAttempts === 1
        ? "You have already completed this quest."
        : `You have used all ${maxAttempts} attempts for this exam.`
    );
  }

  const attemptNumber = completedCount + 1;
  const isLeaderboardEligible = attemptNumber === 1;

  // Build question_order for randomised batches
  let questionOrder: string[] | null = null;
  if (batch.randomize_questions) {
    const { data: qs } = await supabase
      .from("questions")
      .select("id")
      .eq("batch_id", batchId)
      .order("order_index", { ascending: true });

    if (qs && qs.length > 0) {
      questionOrder = shuffleArray(qs.map((q: { id: string }) => q.id));
    }
  }

  const { data, error } = await supabase
    .from("exam_sessions")
    .insert({
      participant_id: participantId,
      batch_id: batchId,
      status: "in_progress",
      question_order: questionOrder,
      attempt_number: attemptNumber,
      is_leaderboard_eligible: isLeaderboardEligible,
    })
    .select()
    .single();

  if (error) {
    // Race condition: another request already inserted; find and return it
    if (error.code === "23505") {
      const { data: race } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("participant_id", participantId)
        .eq("batch_id", batchId)
        .eq("status", "in_progress")
        .maybeSingle();
      if (race) return race as ExamSession;
    }
    throw error;
  }

  return data as ExamSession;
}

// ----------------------------------------------------------------
// Answer submission — unified API with question-type variants
// ----------------------------------------------------------------

type SubmitSingleParams = {
  type: "single";
  participantId: string;
  questionId: string;
  batchId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  points: number;
  streakCount: number;
  timeRemainingRatio: number;
  timeTakenSeconds: number;
};

type SubmitCheckboxParams = {
  type: "checkbox";
  participantId: string;
  questionId: string;
  batchId: string;
  selectedOptionIds: string[];
  question: QuestionWithOptions;
  streakCount: number;
  timeTakenSeconds: number;
};

type SubmitEssayParams = {
  type: "essay";
  participantId: string;
  questionId: string;
  batchId: string;
  essayText: string;
  timeTakenSeconds: number;
};

export type SubmitAnswerParams =
  | SubmitSingleParams
  | SubmitCheckboxParams
  | SubmitEssayParams;

export async function submitAnswer(params: SubmitAnswerParams) {
  if (params.type === "single") {
    const xpEarned = calculateXP({
      isCorrect: params.isCorrect,
      points: params.points,
      streakCount: params.streakCount,
      timeRemainingRatio: params.timeRemainingRatio,
    });
    const pointsEarned = calculateScore({
      isCorrect: params.isCorrect,
      basePoints: params.points,
      streakCount: params.streakCount,
      timeRemainingRatio: params.timeRemainingRatio,
    });

    const { data, error } = await supabase
      .from("answers")
      .insert({
        participant_id: params.participantId,
        question_id: params.questionId,
        batch_id: params.batchId,
        selected_option_id: params.selectedOptionId,
        is_correct: params.isCorrect,
        points_earned: pointsEarned,
        xp_earned: xpEarned,
        streak_count: params.streakCount,
        time_taken_seconds: params.timeTakenSeconds,
      })
      .select()
      .single();

    if (error) throw error;
    return { answer: data, pointsEarned, xpEarned };
  }

  if (params.type === "checkbox") {
    const { question, selectedOptionIds } = params;
    const correctOptions = question.options.filter((o) => o.is_correct);
    const totalCorrect = correctOptions.length;
    const correctPicks = selectedOptionIds.filter((id) =>
      correctOptions.some((o) => o.id === id)
    ).length;
    const ratio = totalCorrect > 0 ? correctPicks / totalCorrect : 0;
    const pointsEarned = Math.round(ratio * question.points);
    const isCorrect = correctPicks === totalCorrect && selectedOptionIds.length === totalCorrect;
    const xpEarned = Math.round(ratio * question.points * 2); // approximate XP

    const { data, error } = await supabase
      .from("answers")
      .insert({
        participant_id: params.participantId,
        question_id: params.questionId,
        batch_id: params.batchId,
        selected_option_ids: selectedOptionIds,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        xp_earned: xpEarned,
        streak_count: params.streakCount,
        time_taken_seconds: params.timeTakenSeconds,
      })
      .select()
      .single();

    if (error) throw error;
    return { answer: data, pointsEarned, xpEarned };
  }

  // Essay
  const { data, error } = await supabase
    .from("answers")
    .insert({
      participant_id: params.participantId,
      question_id: params.questionId,
      batch_id: params.batchId,
      essay_text: params.essayText,
      is_correct: false,
      points_earned: 0,
      xp_earned: 0,
      streak_count: 0,
      time_taken_seconds: params.timeTakenSeconds,
      essay_graded: false,
    })
    .select()
    .single();

  if (error) throw error;
  return { answer: data, pointsEarned: 0, xpEarned: 0 };
}

/**
 * Finish an exam session by session ID.
 * Updates session status and recalculates participant cumulative stats.
 */
export async function finishExam(params: {
  sessionId: string;
  participantId: string;
  totalScore: number;
  totalXP: number;
  maxStreak: number;
  status: "completed" | "timed_out";
}) {
  const { error: sessionError } = await supabase
    .from("exam_sessions")
    .update({
      status: params.status,
      score: params.totalScore,
      total_xp: params.totalXP,
      max_streak: params.maxStreak,
      finished_at: new Date().toISOString(),
    })
    .eq("id", params.sessionId);

  if (sessionError) throw sessionError;

  const { data: pData, error: pError } = await supabase
    .from("participants")
    .select("xp, total_score, quizzes_taken")
    .eq("id", params.participantId)
    .single();

  if (pError || !pData) throw pError ?? new Error("Participant not found");

  const p = pData as { xp: number; total_score: number; quizzes_taken: number };
  const newXP = (p.xp ?? 0) + params.totalXP;
  const newScore = (p.total_score ?? 0) + params.totalScore;
  const newQuizzes = (p.quizzes_taken ?? 0) + 1;

  const { getLevelFromXP } = await import("@/utils/gamification");
  const newLevel = getLevelFromXP(newXP);

  const { error: updateError } = await supabase
    .from("participants")
    .update({ xp: newXP, total_score: newScore, quizzes_taken: newQuizzes, level: newLevel })
    .eq("id", params.participantId);

  if (updateError) throw updateError;

  return { newXP, newScore, newLevel };
}

/**
 * Grade an essay answer. Updates the answer and recalculates the session score.
 */
export async function gradeEssay(params: {
  answerId: string;
  score: number;
  gradedBy: string;
}): Promise<void> {
  // Update the answer with grade
  const { data: answerData, error: answerError } = await supabase
    .from("answers")
    .update({
      essay_graded: true,
      graded_score: params.score,
      points_earned: params.score,
      is_correct: params.score > 0,
      graded_by: params.gradedBy,
      graded_at: new Date().toISOString(),
    })
    .eq("id", params.answerId)
    .select("participant_id, batch_id")
    .single();

  if (answerError) throw answerError;

  const { participant_id, batch_id } = answerData as { participant_id: string; batch_id: string };

  // Recalculate total score from all answers for this participant+batch
  const { data: allAnswers, error: sumError } = await supabase
    .from("answers")
    .select("points_earned")
    .eq("participant_id", participant_id)
    .eq("batch_id", batch_id);

  if (sumError) throw sumError;

  const totalScore = (allAnswers ?? []).reduce(
    (sum: number, a: { points_earned: number }) => sum + (a.points_earned ?? 0),
    0
  );

  // Update the most recent completed session for this participant+batch
  const { error: sessionError } = await supabase
    .from("exam_sessions")
    .update({ score: totalScore })
    .eq("participant_id", participant_id)
    .eq("batch_id", batch_id)
    .in("status", ["completed", "timed_out"]);

  if (sessionError) throw sessionError;
}

/**
 * Get existing exam sessions for a participant+batch (all attempts).
 */
export async function getExamSessions(
  participantId: string,
  batchId: string
): Promise<ExamSession[]> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("*")
    .eq("participant_id", participantId)
    .eq("batch_id", batchId)
    .order("attempt_number", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ExamSession[];
}

/**
 * Get a single exam session for a participant+batch (most recent).
 * @deprecated Prefer getExamSessions() with multiple attempts.
 */
export async function getExamSession(
  participantId: string,
  batchId: string
): Promise<ExamSession | null> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("*")
    .eq("participant_id", participantId)
    .eq("batch_id", batchId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ExamSession | null;
}


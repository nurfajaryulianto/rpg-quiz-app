import { supabase } from "@/lib/supabase";
import type { QuestionWithOptions, ExamSession, Batch } from "@/lib/database.types";
import { shuffleArray, calculateXP, calculateScore } from "@/utils/gamification";

/**
 * Validate that the current time is within the batch's access window.
 * Throws a user-friendly error if the batch cannot be accessed right now.
 */
export function assertBatchAccessible(batch: Batch): void {
  const now = Date.now();

  if (!batch.is_active) {
    throw new Error("This quest is not currently active.");
  }

  if (batch.start_time) {
    const start = new Date(batch.start_time).getTime();
    if (now < start) {
      const diff = Math.ceil((start - now) / 60000);
      throw new Error(
        `This exam hasn't started yet. It opens in ${diff} minute${diff !== 1 ? "s" : ""}.`
      );
    }
  }

  if (batch.end_time) {
    const end = new Date(batch.end_time).getTime();
    if (now > end) {
      throw new Error("The exam window for this quest has closed.");
    }
  }
}

/**
 * Fetch questions for a batch, respecting the stored question_order (for randomization).
 * Options are always shuffled per-request to prevent pattern memorisation.
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

  // Always shuffle answer options to prevent pattern memorisation
  return questions.map((q) => ({
    ...q,
    options: shuffleArray(q.options),
  }));
}

/**
 * Start (or resume) an exam session.
 * On first start, generates a randomised question_order if the batch requires it.
 * Uses a single upsert-like pattern to avoid race conditions on double-clicks.
 */
export async function startExamSession(
  participantId: string,
  batchId: string,
  batch: Batch
): Promise<ExamSession> {
  // Check if session already exists — use .maybeSingle() to avoid 406 errors
  const { data: existing, error: fetchError } = await supabase
    .from("exam_sessions")
    .select("*")
    .eq("participant_id", participantId)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const existingSession = existing as ExamSession | null;
  if (existingSession) {
    if (existingSession.status === "completed" || existingSession.status === "timed_out") {
      throw new Error("You have already completed this quest.");
    }
    return existingSession; // Resume in-progress session
  }

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
    })
    .select()
    .single();

  if (error) {
    // If a concurrent request already inserted, fetch and return that session
    if (error.code === "23505") {
      const { data: race } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("participant_id", participantId)
        .eq("batch_id", batchId)
        .single();
      if (race) return race as ExamSession;
    }
    throw error;
  }

  return data as ExamSession;
}

/**
 * Submit an answer for a question.
 * time_taken_seconds: actual seconds elapsed since the question was shown.
 */
export async function submitAnswer(params: {
  participantId: string;
  questionId: string;
  batchId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  points: number;
  streakCount: number;
  timeRemainingRatio: number;
  timeTakenSeconds: number;
}) {
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

/**
 * Finish an exam session and update participant cumulative stats.
 */
export async function finishExam(params: {
  participantId: string;
  batchId: string;
  totalScore: number;
  totalXP: number;
  maxStreak: number;
  status: "completed" | "timed_out";
}) {
  // Update exam session atomically first
  const { error: sessionError } = await supabase
    .from("exam_sessions")
    .update({
      status: params.status,
      score: params.totalScore,
      total_xp: params.totalXP,
      max_streak: params.maxStreak,
      finished_at: new Date().toISOString(),
    })
    .eq("participant_id", params.participantId)
    .eq("batch_id", params.batchId);

  if (sessionError) throw sessionError;

  // Read current participant stats
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
    .update({
      xp: newXP,
      total_score: newScore,
      quizzes_taken: newQuizzes,
      level: newLevel,
    })
    .eq("id", params.participantId);

  if (updateError) throw updateError;

  return { newXP, newScore, newLevel };
}

/**
 * Get an existing exam session for a participant+batch (null if none).
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
    .maybeSingle();

  if (error) throw error;
  return data;
}


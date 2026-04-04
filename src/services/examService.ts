import { supabase } from "@/lib/supabase";
import type { QuestionWithOptions, ExamSession } from "@/lib/database.types";
import { shuffleArray, calculateXP, calculateScore } from "@/utils/gamification";

/**
 * Fetch questions for a batch, with shuffled options.
 */
export async function fetchExamQuestions(batchId: string): Promise<QuestionWithOptions[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*, options(*)")
    .eq("batch_id", batchId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("No questions found for this batch");

  // Shuffle options for each question
  return data.map((q) => ({
    ...q,
    options: shuffleArray(q.options),
  }));
}

/**
 * Start an exam session.
 */
export async function startExamSession(participantId: string, batchId: string): Promise<ExamSession> {
  // Check if session already exists
  const { data: existing } = await supabase
    .from("exam_sessions")
    .select("*")
    .eq("participant_id", participantId)
    .eq("batch_id", batchId)
    .single();

  const existingSession = existing as ExamSession | null;
  if (existingSession) {
    if (existingSession.status === "completed" || existingSession.status === "timed_out") {
      throw new Error("You have already completed this quiz");
    }
    return existingSession;
  }

  const { data, error } = await supabase
    .from("exam_sessions")
    .insert({
      participant_id: participantId,
      batch_id: batchId,
      status: "in_progress",
    })
    .select()
    .single();

  if (error) throw error;
  return data as ExamSession;
}

/**
 * Submit an answer for a question.
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
    })
    .select()
    .single();

  if (error) throw error;
  return { answer: data, pointsEarned, xpEarned };
}

/**
 * Finish an exam session and update participant stats.
 */
export async function finishExam(params: {
  participantId: string;
  batchId: string;
  totalScore: number;
  totalXP: number;
  maxStreak: number;
  status: "completed" | "timed_out";
}) {
  // Update exam session
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

  // Update participant cumulative stats
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

  // Calculate new level from XP
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
 * Check if a participant has already done a batch.
 */
export async function getExamSession(participantId: string, batchId: string): Promise<ExamSession | null> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("*")
    .eq("participant_id", participantId)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

import { supabase } from "@/lib/supabase";

export interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  xp: number;
  total_score: number;
  quizzes_taken: number;
  avatar_url: string | null;
}

export async function getLeaderboard(limit = 50, signal?: AbortSignal): Promise<LeaderboardEntry[]> {
  const query = supabase
    .from("participants")
    .select("id, name, level, xp, total_score, quizzes_taken, avatar_url")
    .in("role", ["participant", "supervisor"])
    .order("total_score", { ascending: false })
    .limit(limit);
  const { data, error } = await (signal ? query.abortSignal(signal) : query);

  if (error) throw error;
  return data ?? [];
}

export async function getBatchLeaderboard(batchId: string) {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select(`
      score,
      total_xp,
      max_streak,
      finished_at,
      participants (
        id,
        name,
        level,
        avatar_url
      )
    `)
    .eq("batch_id", batchId)
    .eq("is_leaderboard_eligible", true)
    .in("status", ["completed", "timed_out"])
    .order("score", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getReviewAnswers(participantId: string, batchId: string) {
  const { data, error } = await supabase
    .from("answers")
    .select(`
      *,
      questions (
        id,
        question_text,
        points,
        order_index,
        options (*)
      )
    `)
    .eq("participant_id", participantId)
    .eq("batch_id", batchId)
    .order("answered_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

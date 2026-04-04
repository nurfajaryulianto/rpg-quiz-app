import { supabase } from "@/lib/supabase";
import type { QuestionWithOptions, Participant, Batch, ExamSession } from "@/lib/database.types";
import type { ParsedQuestion, ParsedParticipant } from "@/utils/excelParser";

// ============================================
// BATCHES
// ============================================

export async function getBatches(): Promise<Batch[]> {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBatch(id: string) {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createBatch(batch: {
  name: string;
  description?: string;
  time_limit_seconds: number;
  is_active?: boolean;
  created_by?: string;
}) {
  const { data, error } = await supabase
    .from("batches")
    .insert(batch)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBatch(id: string, updates: {
  name?: string;
  description?: string;
  time_limit_seconds?: number;
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from("batches")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBatch(id: string) {
  const { error } = await supabase
    .from("batches")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// QUESTIONS
// ============================================

export async function getQuestionsByBatch(batchId: string) {
  const { data, error } = await supabase
    .from("questions")
    .select("*, options(*)")
    .eq("batch_id", batchId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []) as QuestionWithOptions[];
}

export async function createQuestion(batchId: string, question: {
  question_text: string;
  points: number;
  order_index: number;
  options: { option_text: string; option_label: "A" | "B" | "C" | "D"; is_correct: boolean }[];
}) {
  const { data: questionData, error: qError } = await supabase
    .from("questions")
    .insert({
      batch_id: batchId,
      question_text: question.question_text,
      points: question.points,
      order_index: question.order_index,
    })
    .select()
    .single();

  if (qError) throw qError;

  const options = question.options.map((opt) => ({
    question_id: questionData.id,
    option_text: opt.option_text,
    option_label: opt.option_label,
    is_correct: opt.is_correct,
  }));

  const { error: oError } = await supabase.from("options").insert(options);
  if (oError) throw oError;

  return questionData;
}

export async function updateQuestion(questionId: string, updates: {
  question_text?: string;
  points?: number;
  options?: { id?: string; option_text: string; option_label: "A" | "B" | "C" | "D"; is_correct: boolean }[];
}) {
  if (updates.question_text !== undefined || updates.points !== undefined) {
    const { error } = await supabase
      .from("questions")
      .update({
        ...(updates.question_text !== undefined && { question_text: updates.question_text }),
        ...(updates.points !== undefined && { points: updates.points }),
      })
      .eq("id", questionId);

    if (error) throw error;
  }

  if (updates.options) {
    // Delete existing options and re-insert
    await supabase.from("options").delete().eq("question_id", questionId);

    const options = updates.options.map((opt) => ({
      question_id: questionId,
      option_text: opt.option_text,
      option_label: opt.option_label,
      is_correct: opt.is_correct,
    }));

    const { error } = await supabase.from("options").insert(options);
    if (error) throw error;
  }
}

export async function deleteQuestion(questionId: string) {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) throw error;
}

export async function uploadQuestions(batchId: string, questions: ParsedQuestion[]) {
  const results = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const { data: questionData, error: qError } = await supabase
      .from("questions")
      .insert({
        batch_id: batchId,
        question_text: q.question_text,
        points: q.points,
        order_index: i,
      })
      .select()
      .single();

    if (qError) throw qError;

    const options = [
      { question_id: questionData.id, option_text: q.option_a, option_label: "A" as const, is_correct: q.correct_answer === "A" },
      { question_id: questionData.id, option_text: q.option_b, option_label: "B" as const, is_correct: q.correct_answer === "B" },
      { question_id: questionData.id, option_text: q.option_c, option_label: "C" as const, is_correct: q.correct_answer === "C" },
      { question_id: questionData.id, option_text: q.option_d, option_label: "D" as const, is_correct: q.correct_answer === "D" },
    ];

    const { error: oError } = await supabase
      .from("options")
      .insert(options);

    if (oError) throw oError;

    results.push(questionData);
  }

  return results;
}

export async function deleteQuestionsByBatch(batchId: string) {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("batch_id", batchId);

  if (error) throw error;
}

// ============================================
// PARTICIPANTS
// ============================================

export async function getParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .order("total_score", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createParticipant(participant: {
  name: string;
  nik: string;
  role?: "participant" | "admin";
}) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: participant.name, nik: participant.nik }),
  });

  const result = await res.json();
  if (!result.success) {
    const failedMsg = result.results?.find((r: { success: boolean; error?: string }) => !r.success)?.error;
    throw new Error(failedMsg ?? result.message ?? "Failed to create participant");
  }
  return result;
}

export async function updateParticipant(id: string, updates: {
  name?: string;
  nik?: string;
  role?: "participant" | "admin";
}) {
  const { data, error } = await supabase
    .from("participants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function resetParticipantProgress(id: string) {
  const { error } = await supabase
    .from("participants")
    .update({
      level: 1,
      xp: 0,
      total_score: 0,
      quizzes_taken: 0,
    })
    .eq("id", id);

  if (error) throw error;

  // Delete their answers and exam sessions
  await supabase.from("answers").delete().eq("participant_id", id);
  await supabase.from("exam_sessions").delete().eq("participant_id", id);
}

export async function uploadParticipants(participants: ParsedParticipant[]) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participants: participants.map((p) => ({ name: p.name, nik: p.nik })),
    }),
  });

  const result = await res.json();
  if (!result.success) {
    const failedCount = result.results?.filter((r: { success: boolean }) => !r.success).length ?? 0;
    throw new Error(`${failedCount} participant(s) failed to create`);
  }
  return result.results ?? [];
}

export async function deleteParticipant(id: string) {
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// EXAM SESSIONS / RESULTS
// ============================================

export async function getExamSessions(batchId?: string): Promise<(ExamSession & { participant_name?: string; batch_name?: string })[]> {
  let query = supabase
    .from("exam_sessions")
    .select("*, participants(name), batches(name)")
    .order("score", { ascending: false });

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((session: Record<string, unknown>) => ({
    ...(session as unknown as ExamSession),
    participant_name: (session.participants as { name: string } | null)?.name ?? "Unknown",
    batch_name: (session.batches as { name: string } | null)?.name ?? "Unknown",
  }));
}

export async function resetBatchResults(batchId: string) {
  // Delete all answers for this batch
  const { error: ansError } = await supabase
    .from("answers")
    .delete()
    .eq("batch_id", batchId);

  if (ansError) throw ansError;

  // Delete all exam sessions for this batch
  const { error: sesError } = await supabase
    .from("exam_sessions")
    .delete()
    .eq("batch_id", batchId);

  if (sesError) throw sesError;
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getAdminStats() {
  const [batches, participants, questions, activeBatches, examSessions] = await Promise.all([
    supabase.from("batches").select("id", { count: "exact" }),
    supabase.from("participants").select("id", { count: "exact" }).eq("role", "participant"),
    supabase.from("questions").select("id", { count: "exact" }),
    supabase.from("batches").select("id", { count: "exact" }).eq("is_active", true),
    supabase.from("exam_sessions").select("id", { count: "exact" }).eq("status", "completed"),
  ]);

  return {
    totalBatches: batches.count ?? 0,
    totalParticipants: participants.count ?? 0,
    totalQuestions: questions.count ?? 0,
    activeBatches: activeBatches.count ?? 0,
    completedExams: examSessions.count ?? 0,
  };
}

export async function getRecentActivity() {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("*, participants(name), batches(name)")
    .order("started_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((session: Record<string, unknown>) => ({
    ...(session as unknown as ExamSession),
    participant_name: (session.participants as { name: string } | null)?.name ?? "Unknown",
    batch_name: (session.batches as { name: string } | null)?.name ?? "Unknown",
  }));
}

export async function getBatchStats(batchId: string) {
  const [questions, sessions, answers] = await Promise.all([
    supabase.from("questions").select("id", { count: "exact" }).eq("batch_id", batchId),
    supabase.from("exam_sessions").select("*, participants(name)").eq("batch_id", batchId).order("score", { ascending: false }),
    supabase.from("answers").select("is_correct").eq("batch_id", batchId),
  ]);

  const totalAnswers = answers.data?.length ?? 0;
  const correctAnswers = answers.data?.filter((a: { is_correct: boolean }) => a.is_correct).length ?? 0;
  const avgAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  const sessionData = (sessions.data ?? []).map((s: Record<string, unknown>) => ({
    ...(s as unknown as ExamSession),
    participant_name: (s.participants as { name: string } | null)?.name ?? "Unknown",
  }));

  const avgScore = sessionData.length > 0
    ? Math.round(sessionData.reduce((sum: number, s: ExamSession) => sum + s.score, 0) / sessionData.length)
    : 0;

  return {
    totalQuestions: questions.count ?? 0,
    totalSessions: sessionData.length,
    avgAccuracy,
    avgScore,
    topScorers: sessionData.slice(0, 5),
  };
}

// ============================================
// BATCH PARTICIPANTS (assign users to batches)
// ============================================

export async function getBatchParticipants(batchId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("batch_participants")
    .select("participant_id, participants(*)")
    .eq("batch_id", batchId);

  if (error) throw error;
  return (data ?? []).map(
    (bp: { participant_id: string; participants: unknown }) => bp.participants as Participant
  );
}

export async function addParticipantsToBatch(batchId: string, participantIds: string[]) {
  const rows = participantIds.map((pid) => ({ batch_id: batchId, participant_id: pid }));
  const { error } = await supabase.from("batch_participants").upsert(rows, { onConflict: "batch_id,participant_id" });
  if (error) throw error;
}

export async function removeParticipantFromBatch(batchId: string, participantId: string) {
  const { error } = await supabase
    .from("batch_participants")
    .delete()
    .eq("batch_id", batchId)
    .eq("participant_id", participantId);
  if (error) throw error;
}

export async function getAssignedBatchIds(participantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("batch_participants")
    .select("batch_id")
    .eq("participant_id", participantId);

  if (error) throw error;
  return (data ?? []).map((bp: { batch_id: string }) => bp.batch_id);
}

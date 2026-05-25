import { supabase } from "@/lib/supabase";
import type { QuestionWithOptions, Participant, Batch, ExamSession, QuestionArchive, ArchiveQuestionWithOptions, BatchQuestionSetting } from "@/lib/database.types";
import type { ParsedQuestion, ParsedParticipant } from "@/utils/excelParser";
import { shuffleArray } from "@/utils/gamification";

// ============================================
// BATCHES
// ============================================

export async function getBatches(signal?: AbortSignal): Promise<Batch[]> {
  const query = supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);

  if (error) throw error;
  const batches = data ?? [];

  // Auto-deactivate any batch where end_time has passed but is still marked active
  const now = new Date().toISOString();
  const toDeactivate = batches.filter(
    (b) => b.is_active && b.end_time != null && b.end_time < now
  );
  if (toDeactivate.length > 0) {
    await supabase
      .from("batches")
      .update({ is_active: false })
      .in("id", toDeactivate.map((b) => b.id));
    toDeactivate.forEach((b) => { b.is_active = false; });
  }

  return batches;
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
  randomize_questions?: boolean;
  start_time?: string | null;
  end_time?: string | null;
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
  randomize_questions?: boolean;
  start_time?: string | null;
  end_time?: string | null;
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

export async function getQuestionsByBatch(batchId: string, signal?: AbortSignal) {
  const query = supabase
    .from("questions")
    .select("*, options(*)")
    .eq("batch_id", batchId)
    .order("order_index", { ascending: true });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);

  if (error) throw error;
  return (data ?? []) as QuestionWithOptions[];
}

export async function createQuestion(batchId: string, question: {
  question_text: string;
  question_type?: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
  category?: string | null;
  difficulty?: "easy" | "medium" | "hard";
  points: number;
  order_index: number;
  options: { option_text: string; option_label: string; is_correct: boolean }[];
}) {
  const { data: questionData, error: qError } = await supabase
    .from("questions")
    .insert({
      batch_id: batchId,
      question_text: question.question_text,
      question_type: question.question_type ?? "multiple_choice",
      category: question.category ?? null,
      difficulty: question.difficulty ?? "medium",
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
  question_type?: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
  category?: string | null;
  difficulty?: "easy" | "medium" | "hard";
  points?: number;
  options?: { id?: string; option_text: string; option_label: string; is_correct: boolean }[];
}) {
  const fieldUpdates: Record<string, unknown> = {};
  if (updates.question_text !== undefined) fieldUpdates.question_text = updates.question_text;
  if (updates.question_type !== undefined) fieldUpdates.question_type = updates.question_type;
  if (updates.category !== undefined) fieldUpdates.category = updates.category;
  if (updates.difficulty !== undefined) fieldUpdates.difficulty = updates.difficulty;
  if (updates.points !== undefined) fieldUpdates.points = updates.points;

  if (Object.keys(fieldUpdates).length > 0) {
    const { error } = await supabase
      .from("questions")
      .update(fieldUpdates)
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
        question_type: q.question_type ?? "multiple_choice",
        category: q.category ?? null,
        difficulty: q.difficulty ?? "medium",
        points: q.points,
        order_index: i,
      })
      .select()
      .single();

    if (qError) throw qError;

    // Essay: no options to insert
    if (q.question_type === "essay") {
      results.push(questionData);
      continue;
    }

    let options: { question_id: string; option_text: string; option_label: string; is_correct: boolean }[];

    if (q.question_type === "true_false") {
      options = [
        { question_id: questionData.id, option_text: "Benar", option_label: "A", is_correct: q.correct_answer === "A" },
        { question_id: questionData.id, option_text: "Salah", option_label: "B", is_correct: q.correct_answer === "B" },
      ];
    } else if (q.question_type === "binary") {
      options = [
        { question_id: questionData.id, option_text: "Ya", option_label: "A", is_correct: q.correct_answer === "A" },
        { question_id: questionData.id, option_text: "Tidak", option_label: "B", is_correct: q.correct_answer === "B" },
      ];
    } else if (q.question_type === "checkbox") {
      // correct_answers is comma-separated e.g. "A,C"
      const correctLabels = (q.correct_answers ?? "").split(",").map((s) => s.trim().toUpperCase());
      const rawOpts = [
        { text: q.option_a, label: "A" },
        { text: q.option_b, label: "B" },
        { text: q.option_c, label: "C" },
        { text: q.option_d, label: "D" },
      ];
      options = rawOpts
        .filter((o) => o.text.trim() !== "")
        .map((o) => ({
          question_id: questionData.id,
          option_text: o.text,
          option_label: o.label,
          is_correct: correctLabels.includes(o.label),
        }));
    } else {
      // multiple_choice
      options = [
        { question_id: questionData.id, option_text: q.option_a, option_label: "A", is_correct: q.correct_answer === "A" },
        { question_id: questionData.id, option_text: q.option_b, option_label: "B", is_correct: q.correct_answer === "B" },
        { question_id: questionData.id, option_text: q.option_c, option_label: "C", is_correct: q.correct_answer === "C" },
        { question_id: questionData.id, option_text: q.option_d, option_label: "D", is_correct: q.correct_answer === "D" },
      ];
    }

    const { error: oError } = await supabase.from("options").insert(options);
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

export async function getParticipants(signal?: AbortSignal): Promise<Participant[]> {
  const query = supabase
    .from("participants")
    .select("*")
    .order("total_score", { ascending: false });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);

  if (error) throw error;
  return data ?? [];
}

export async function createParticipant(participant: {
  name: string;
  nik: string;
  role?: "participant" | "supervisor" | "admin";
  area?: string | null;
  jabatan?: string | null;
  sub_dept?: string | null;
}) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: participant.name,
      nik: participant.nik,
      role: participant.role ?? "participant",
      area: participant.area ?? null,
      jabatan: participant.jabatan ?? null,
      sub_dept: participant.sub_dept ?? null,
    }),
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
  role?: "participant" | "supervisor" | "admin";
  area?: string | null;
  jabatan?: string | null;
  sub_dept?: string | null;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/admin/update-participant", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ id, updates }),
  });
  const result = await res.json();
  if (!result.success) throw new Error(result.message ?? "Failed to update participant");
  return result.data;
}

export async function resetParticipantPassword(participantId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/admin/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ participantId }),
  });
  const result = await res.json();
  if (!result.success) throw new Error(result.message ?? "Failed to reset password");
  return result.message as string;
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
      participants: participants.map((p) => ({
        name: p.name,
        nik: p.nik,
        jabatan: p.jabatan ?? null,
        sub_dept: p.sub_dept ?? null,
      })),
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

export async function getExamSessions(batchId?: string, signal?: AbortSignal): Promise<(ExamSession & { participant_name?: string; batch_name?: string })[]> {
  let query = supabase
    .from("exam_sessions")
    .select("*, participants(name), batches(name)")
    .order("score", { ascending: false });

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }
  if (signal) {
    query = query.abortSignal(signal);
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

export async function getAdminStats(signal?: AbortSignal) {
  const [batches, participants, questions, activeBatches, examSessions] = await Promise.all([
    signal ? supabase.from("batches").select("id", { count: "exact" }).abortSignal(signal) : supabase.from("batches").select("id", { count: "exact" }),
    signal ? supabase.from("participants").select("id", { count: "exact" }).eq("role", "participant").abortSignal(signal) : supabase.from("participants").select("id", { count: "exact" }).eq("role", "participant"),
    signal ? supabase.from("questions").select("id", { count: "exact" }).abortSignal(signal) : supabase.from("questions").select("id", { count: "exact" }),
    signal ? supabase.from("batches").select("id", { count: "exact" }).eq("is_active", true).abortSignal(signal) : supabase.from("batches").select("id", { count: "exact" }).eq("is_active", true),
    signal ? supabase.from("exam_sessions").select("id", { count: "exact" }).eq("status", "completed").abortSignal(signal) : supabase.from("exam_sessions").select("id", { count: "exact" }).eq("status", "completed"),
  ]);

  return {
    totalBatches: batches.count ?? 0,
    totalParticipants: participants.count ?? 0,
    totalQuestions: questions.count ?? 0,
    activeBatches: activeBatches.count ?? 0,
    completedExams: examSessions.count ?? 0,
  };
}

export async function getRecentActivity(signal?: AbortSignal) {
  const query = supabase
    .from("exam_sessions")
    .select("*, participants(name), batches(name)")
    .order("started_at", { ascending: false })
    .limit(10);
  const { data, error } = await (signal ? query.abortSignal(signal) : query);

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

// ============================================
// BATCH DUPLICATION
// ============================================

export async function duplicateBatch(batchId: string, createdBy?: string): Promise<Batch> {
  // Fetch original batch and its questions+options
  const [batchRes, questionsRes] = await Promise.all([
    supabase.from("batches").select("*").eq("id", batchId).single(),
    supabase.from("questions").select("*, options(*)").eq("batch_id", batchId).order("order_index", { ascending: true }),
  ]);

  if (batchRes.error) throw batchRes.error;
  const original = batchRes.data as Batch;

  // Create new batch (inactive by default)
  const { data: newBatch, error: bError } = await supabase
    .from("batches")
    .insert({
      name: `${original.name} (Copy)`,
      description: original.description,
      time_limit_seconds: original.time_limit_seconds,
      randomize_questions: original.randomize_questions,
      is_active: false,
      created_by: createdBy ?? original.created_by,
    })
    .select()
    .single();

  if (bError) throw bError;

  // Copy all questions and options
  const originalQuestions = (questionsRes.data ?? []) as QuestionWithOptions[];
  for (const q of originalQuestions) {
    const { data: newQ, error: qError } = await supabase
      .from("questions")
      .insert({
        batch_id: newBatch.id,
        question_text: q.question_text,
        question_type: q.question_type,
        category: q.category,
        difficulty: q.difficulty,
        points: q.points,
        order_index: q.order_index,
      })
      .select()
      .single();

    if (qError) throw qError;

    if (q.options && q.options.length > 0) {
      const { error: oError } = await supabase.from("options").insert(
        q.options.map((opt) => ({
          question_id: newQ.id,
          option_text: opt.option_text,
          option_label: opt.option_label,
          is_correct: opt.is_correct,
        }))
      );
      if (oError) throw oError;
    }
  }

  return newBatch as Batch;
}

// ============================================
// ANALYTICS
// ============================================

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  category: string | null;
  difficulty: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number;
  avgTimeTakenSeconds: number;
  points: number;
}

export interface CategoryAnalytics {
  category: string;
  totalQuestions: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number;
  avgTimeTakenSeconds: number;
}

export interface BatchAnalytics {
  batchId: string;
  totalParticipants: number;
  completedCount: number;
  inProgressCount: number;
  timedOutCount: number;
  avgScore: number;
  avgAccuracy: number;
  topScore: number;
  lowestScore: number;
  questionAnalytics: QuestionAnalytics[];
  categoryAnalytics: CategoryAnalytics[];
  difficultyBreakdown: { difficulty: string; count: number; accuracyRate: number }[];
}

export async function getBatchAnalytics(batchId: string, signal?: AbortSignal): Promise<BatchAnalytics> {
  const [sessionsRes, questionsRes, answersRes] = await Promise.all([
    signal ? supabase.from("exam_sessions").select("*").eq("batch_id", batchId).abortSignal(signal) : supabase.from("exam_sessions").select("*").eq("batch_id", batchId),
    signal ? supabase.from("questions").select("*, options(*)").eq("batch_id", batchId).order("order_index", { ascending: true }).abortSignal(signal) : supabase.from("questions").select("*, options(*)").eq("batch_id", batchId).order("order_index", { ascending: true }),
    signal ? supabase.from("answers").select("question_id, is_correct, time_taken_seconds").eq("batch_id", batchId).abortSignal(signal) : supabase.from("answers").select("question_id, is_correct, time_taken_seconds").eq("batch_id", batchId),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (answersRes.error) throw answersRes.error;

  const sessions = (sessionsRes.data ?? []) as ExamSession[];
  const questions = (questionsRes.data ?? []) as QuestionWithOptions[];
  const answers = (answersRes.data ?? []) as {
    question_id: string;
    is_correct: boolean;
    time_taken_seconds: number;
  }[];

  // Build a map: questionId -> { correct, total, totalTime }
  const qMap = new Map<string, { correct: number; total: number; totalTime: number }>();
  for (const a of answers) {
    const entry = qMap.get(a.question_id) ?? { correct: 0, total: 0, totalTime: 0 };
    entry.total += 1;
    if (a.is_correct) entry.correct += 1;
    entry.totalTime += a.time_taken_seconds;
    qMap.set(a.question_id, entry);
  }

  const questionAnalytics: QuestionAnalytics[] = questions.map((q) => {
    const stats = qMap.get(q.id) ?? { correct: 0, total: 0, totalTime: 0 };
    return {
      questionId: q.id,
      questionText: q.question_text,
      category: q.category,
      difficulty: q.difficulty,
      totalAttempts: stats.total,
      correctAttempts: stats.correct,
      accuracyRate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      avgTimeTakenSeconds: stats.total > 0 ? Math.round(stats.totalTime / stats.total) : 0,
      points: q.points,
    };
  });

  // Per-category analytics
  const catMap = new Map<string, { total: number; correct: number; totalTime: number; attempts: number }>();
  for (const qa of questionAnalytics) {
    const cat = qa.category ?? "Uncategorized";
    const entry = catMap.get(cat) ?? { total: 0, correct: 0, totalTime: 0, attempts: 0 };
    entry.total += 1;
    entry.correct += qa.correctAttempts;
    entry.totalTime += qa.avgTimeTakenSeconds * qa.totalAttempts;
    entry.attempts += qa.totalAttempts;
    catMap.set(cat, entry);
  }

  const categoryAnalytics: CategoryAnalytics[] = Array.from(catMap.entries()).map(([cat, stats]) => ({
    category: cat,
    totalQuestions: stats.total,
    totalAttempts: stats.attempts,
    correctAttempts: stats.correct,
    accuracyRate: stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0,
    avgTimeTakenSeconds: stats.attempts > 0 ? Math.round(stats.totalTime / stats.attempts) : 0,
  }));

  // Per-difficulty breakdown
  const diffMap = new Map<string, { count: number; correct: number; total: number }>();
  for (const qa of questionAnalytics) {
    const diff = qa.difficulty;
    const entry = diffMap.get(diff) ?? { count: 0, correct: 0, total: 0 };
    entry.count += 1;
    entry.correct += qa.correctAttempts;
    entry.total += qa.totalAttempts;
    diffMap.set(diff, entry);
  }

  const difficultyBreakdown = Array.from(diffMap.entries()).map(([diff, stats]) => ({
    difficulty: diff,
    count: stats.count,
    accuracyRate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  }));

  const completed = sessions.filter((s) => s.status === "completed");
  const scores = completed.map((s) => s.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const topScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

  const totalAnswers = answers.length;
  const totalCorrect = answers.filter((a) => a.is_correct).length;
  const avgAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  return {
    batchId,
    totalParticipants: sessions.length,
    completedCount: completed.length,
    inProgressCount: sessions.filter((s) => s.status === "in_progress").length,
    timedOutCount: sessions.filter((s) => s.status === "timed_out").length,
    avgScore,
    avgAccuracy,
    topScore,
    lowestScore,
    questionAnalytics,
    categoryAnalytics,
    difficultyBreakdown,
  };
}

// ============================================
// PARTICIPANT DRILL-DOWN ANSWERS
// ============================================

export interface ParticipantAnswerDetail {
  questionId: string;
  questionText: string;
  category: string | null;
  difficulty: string;
  points: number;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  correctOptionText: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  timeTakenSeconds: number;
  streakCount: number;
}

export async function getParticipantAnswers(
  participantId: string,
  batchId: string
): Promise<ParticipantAnswerDetail[]> {
  const { data, error } = await supabase
    .from("answers")
    .select(`
      question_id,
      selected_option_id,
      is_correct,
      points_earned,
      time_taken_seconds,
      streak_count,
      questions (
        question_text,
        category,
        difficulty,
        points,
        options ( id, option_text, is_correct )
      )
    `)
    .eq("participant_id", participantId)
    .eq("batch_id", batchId);

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const q = row.questions as {
      question_text: string;
      category: string | null;
      difficulty: string;
      points: number;
      options: { id: string; option_text: string; is_correct: boolean }[];
    } | null;

    const selectedOpt = q?.options?.find((o) => o.id === row.selected_option_id) ?? null;
    const correctOpt = q?.options?.find((o) => o.is_correct) ?? null;

    return {
      questionId: row.question_id as string,
      questionText: q?.question_text ?? "",
      category: q?.category ?? null,
      difficulty: q?.difficulty ?? "medium",
      points: q?.points ?? 0,
      selectedOptionId: (row.selected_option_id as string | null),
      selectedOptionText: selectedOpt?.option_text ?? null,
      correctOptionText: correctOpt?.option_text ?? null,
      isCorrect: row.is_correct as boolean,
      pointsEarned: row.points_earned as number,
      timeTakenSeconds: row.time_taken_seconds as number,
      streakCount: row.streak_count as number,
    };
  });
}

// ============================================
// EXCEL EXPORT DATA
// ============================================

export interface ExportRow {
  no: number;
  participant: string;
  batch: string;
  score: number;
  xp: number;
  maxStreak: number;
  status: string;
  startedAt: string;
  finishedAt: string;
  durationMinutes: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracyPercent: number;
}

export async function getBatchExportData(batchId: string): Promise<ExportRow[]> {
  const [sessionsRes, answersRes, questionsRes] = await Promise.all([
    supabase
      .from("exam_sessions")
      .select("*, participants(name), batches(name)")
      .eq("batch_id", batchId)
      .order("score", { ascending: false }),
    supabase
      .from("answers")
      .select("participant_id, is_correct")
      .eq("batch_id", batchId),
    supabase.from("questions").select("id", { count: "exact" }).eq("batch_id", batchId),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;

  const sessions = sessionsRes.data ?? [];
  const answers = (answersRes.data ?? []) as { participant_id: string; is_correct: boolean }[];
  const totalQ = questionsRes.count ?? 0;

  // Build per-participant correct count
  const correctMap = new Map<string, number>();
  for (const a of answers) {
    correctMap.set(a.participant_id, (correctMap.get(a.participant_id) ?? 0) + (a.is_correct ? 1 : 0));
  }

  return sessions.map((s: Record<string, unknown>, idx: number) => {
    const batchName = (s.batches as { name: string } | null)?.name ?? "Unknown";
    const participantName = (s.participants as { name: string } | null)?.name ?? "Unknown";
    const startedAt = s.started_at as string;
    const finishedAt = s.finished_at as string | null;
    const durationMs = finishedAt
      ? new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      : 0;
    const correct = correctMap.get(s.participant_id as string) ?? 0;

    return {
      no: idx + 1,
      participant: participantName,
      batch: batchName,
      score: s.score as number,
      xp: s.total_xp as number,
      maxStreak: s.max_streak as number,
      status: s.status as string,
      startedAt: startedAt ? new Date(startedAt).toLocaleString("id-ID") : "-",
      finishedAt: finishedAt ? new Date(finishedAt).toLocaleString("id-ID") : "-",
      durationMinutes: Math.round(durationMs / 60000),
      correctAnswers: correct,
      totalQuestions: totalQ,
      accuracyPercent: totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0,
    };
  });
}

// ============================================
// GOOGLE SHEETS EXPORT DATA
// ============================================

export interface SheetsExportQuestion {
  id: string;
  text: string;
  correctLabel: string;
  category: string | null;
}

export interface SheetsExportParticipantRow {
  timestamp: string;
  name: string;
  nik: string;
  jabatan: string;
  sub_dept: string;
  score: number;
  answers: Record<string, string>; // questionId → option label (A/B/C/D)
}

export interface SheetsExportData {
  batchName: string;
  questions: SheetsExportQuestion[];
  rows: SheetsExportParticipantRow[];
}

export async function getBatchDetailedExportData(batchId: string): Promise<SheetsExportData> {
  // Fetch batch, questions+options, sessions, answers, participants in parallel
  const [batchRes, questionsRes, sessionsRes] = await Promise.all([
    supabase.from("batches").select("name").eq("id", batchId).single(),
    supabase
      .from("questions")
      .select("id, question_text, category, options(option_label, is_correct)")
      .eq("batch_id", batchId)
      .order("order_index", { ascending: true }),
    supabase
      .from("exam_sessions")
      .select("participant_id, score, finished_at, participants(name, nik, jabatan, sub_dept)")
      .eq("batch_id", batchId)
      .eq("status", "completed")
      .order("score", { ascending: false }),
  ]);

  if (batchRes.error) throw batchRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;

  const batchName = (batchRes.data as { name: string }).name;
  const rawQuestions = (questionsRes.data ?? []) as {
    id: string;
    question_text: string;
    category: string | null;
    options: { option_label: string; is_correct: boolean }[];
  }[];
  const rawSessions = (sessionsRes.data ?? []) as {
    participant_id: string;
    score: number;
    finished_at: string | null;
    participants: { name: string; nik: string | null; jabatan: string | null; sub_dept: string | null } | null;
  }[];

  // Build questions list with correct label
  const questions: SheetsExportQuestion[] = rawQuestions.map((q) => {
    const correctOpt = q.options.find((o) => o.is_correct);
    return {
      id: q.id,
      text: q.question_text,
      correctLabel: correctOpt?.option_label ?? "?",
      category: q.category,
    };
  });

  if (rawSessions.length === 0) {
    return { batchName, questions, rows: [] };
  }

  // Fetch answers joined with options to resolve the label (A/B/C/D)
  const participantIds = rawSessions.map((s) => s.participant_id);
  const { data: answersData, error: answersError } = await supabase
    .from("answers")
    .select("participant_id, question_id, selected_option_id, options(id, option_label)")
    .eq("batch_id", batchId)
    .in("participant_id", participantIds);

  if (answersError) throw answersError;

  // Build answer map: participantId → questionId → optionLabel
  const answerMap = new Map<string, Map<string, string>>();
  for (const ans of answersData ?? []) {
    const a = ans as unknown as {
      participant_id: string;
      question_id: string;
      selected_option_id: string | null;
      options: { id: string; option_label: string } | null;
    };
    const label = a.options?.option_label ?? "-";
    if (!answerMap.has(a.participant_id)) answerMap.set(a.participant_id, new Map());
    answerMap.get(a.participant_id)!.set(a.question_id, label);
  }

  const rows: SheetsExportParticipantRow[] = rawSessions.map((s) => {
    const p = s.participants;
    const qAnswers: Record<string, string> = {};
    const pAnswerMap = answerMap.get(s.participant_id);
    for (const q of questions) {
      qAnswers[q.id] = pAnswerMap?.get(q.id) ?? "-";
    }
    return {
      timestamp: s.finished_at ? new Date(s.finished_at).toLocaleString("id-ID") : "-",
      name: p?.name ?? "-",
      nik: p?.nik ?? "-",
      jabatan: p?.jabatan ?? "-",
      sub_dept: p?.sub_dept ?? "-",
      score: s.score,
      answers: qAnswers,
    };
  });

  return { batchName, questions, rows };
}

export async function exportBatchToGoogleSheets(batchId: string, spreadsheetId?: string): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/admin/export-to-sheets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ batchId, spreadsheetId }),
  });
  const result = await res.json();
  if (!result.success) throw new Error(result.message ?? "Failed to export to Google Sheets");
  return { url: result.url };
}

// ============================================
// QUESTION ARCHIVES (Bank Soal)
// ============================================

export async function getArchives(signal?: AbortSignal): Promise<QuestionArchive[]> {
  const query = supabase
    .from("question_archives")
    .select("*")
    .order("created_at", { ascending: false });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return data ?? [];
}

export async function createArchive(archive: { name: string; description?: string }) {
  const { data, error } = await supabase
    .from("question_archives")
    .insert(archive)
    .select()
    .single();
  if (error) throw error;
  return data as QuestionArchive;
}

export async function updateArchive(id: string, updates: { name?: string; description?: string }) {
  const { data, error } = await supabase
    .from("question_archives")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as QuestionArchive;
}

export async function deleteArchive(id: string) {
  const { error } = await supabase.from("question_archives").delete().eq("id", id);
  if (error) throw error;
}

export async function getArchiveQuestions(archiveId: string, signal?: AbortSignal): Promise<ArchiveQuestionWithOptions[]> {
  const query = supabase
    .from("archive_questions")
    .select("*, archive_options(*)")
    .eq("archive_id", archiveId)
    .order("order_index", { ascending: true });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return (data ?? []) as unknown as ArchiveQuestionWithOptions[];
}

export async function createArchiveQuestion(
  archiveId: string,
  question: {
    question_text: string;
    question_type: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
    category?: string | null;
    difficulty: "easy" | "medium" | "hard" | "very_hard";
    default_points: number;
    order_index?: number;
    options: { option_text: string; option_label: string; is_correct: boolean }[];
  }
) {
  const { data: qData, error: qError } = await supabase
    .from("archive_questions")
    .insert({
      archive_id: archiveId,
      question_text: question.question_text,
      question_type: question.question_type,
      category: question.category ?? null,
      difficulty: question.difficulty,
      default_points: question.default_points,
      order_index: question.order_index ?? 0,
    })
    .select()
    .single();
  if (qError) throw qError;

  if (question.options.length > 0) {
    const { error: oError } = await supabase.from("archive_options").insert(
      question.options.map((o) => ({ question_id: qData.id, ...o }))
    );
    if (oError) throw oError;
  }
  return qData;
}

export async function updateArchiveQuestion(
  questionId: string,
  updates: {
    question_text?: string;
    question_type?: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
    category?: string | null;
    difficulty?: "easy" | "medium" | "hard" | "very_hard";
    default_points?: number;
    options?: { option_text: string; option_label: string; is_correct: boolean }[];
  }
) {
  const { question_text, question_type, category, difficulty, default_points, options } = updates;
  const fieldUpdates: Record<string, unknown> = {};
  if (question_text !== undefined) fieldUpdates.question_text = question_text;
  if (question_type !== undefined) fieldUpdates.question_type = question_type;
  if (category !== undefined) fieldUpdates.category = category;
  if (difficulty !== undefined) fieldUpdates.difficulty = difficulty;
  if (default_points !== undefined) fieldUpdates.default_points = default_points;

  if (Object.keys(fieldUpdates).length > 0) {
    const { error } = await supabase.from("archive_questions").update(fieldUpdates).eq("id", questionId);
    if (error) throw error;
  }

  if (options) {
    await supabase.from("archive_options").delete().eq("question_id", questionId);
    const { error } = await supabase.from("archive_options").insert(
      options.map((o) => ({ question_id: questionId, ...o }))
    );
    if (error) throw error;
  }
}

export async function deleteArchiveQuestion(questionId: string) {
  const { error } = await supabase.from("archive_questions").delete().eq("id", questionId);
  if (error) throw error;
}

// ---- Batch ↔ Archive linking ----

export async function getBatchArchiveIds(batchId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("batch_archives")
    .select("archive_id")
    .eq("batch_id", batchId);
  if (error) throw error;
  return (data ?? []).map((r: { archive_id: string }) => r.archive_id);
}

export async function setBatchArchives(batchId: string, archiveIds: string[]) {
  // Replace all links for this batch
  await supabase.from("batch_archives").delete().eq("batch_id", batchId);
  if (archiveIds.length === 0) return;
  const { error } = await supabase.from("batch_archives").insert(
    archiveIds.map((aid) => ({ batch_id: batchId, archive_id: aid }))
  );
  if (error) throw error;
}

// ---- Batch question settings ----

export async function getBatchQuestionSettings(batchId: string): Promise<BatchQuestionSetting[]> {
  const { data, error } = await supabase
    .from("batch_question_settings")
    .select("*")
    .eq("batch_id", batchId);
  if (error) throw error;
  return (data ?? []) as BatchQuestionSetting[];
}

export async function setBatchQuestionSettings(
  batchId: string,
  settings: { question_type: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay"; count: number; points_per_question: number; include_difficulties: string[] }[]
) {
  await supabase.from("batch_question_settings").delete().eq("batch_id", batchId);
  const rows = settings
    .filter((s) => s.count > 0 || s.points_per_question > 0)
    .map((s) => ({ batch_id: batchId, ...s }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("batch_question_settings").insert(rows);
  if (error) throw error;
}

// ---- Generate questions from archives ----

export async function generateBatchQuestionsFromArchives(
  batchId: string
): Promise<{ total: number; totalScore: number }> {
  // 1. Fetch linked archive IDs
  const archiveIds = await getBatchArchiveIds(batchId);
  if (archiveIds.length === 0) throw new Error("Tidak ada bank soal yang dipilih untuk batch ini.");

  // 2. Fetch settings for each question type
  const settings = await getBatchQuestionSettings(batchId);
  const activeSettings = settings.filter((s) => s.count > 0);
  if (activeSettings.length === 0) throw new Error("Belum ada konfigurasi jumlah soal. Atur 'Pengaturan Soal' terlebih dahulu.");

  // 3. Delete existing questions for this batch (fresh generation)
  await deleteQuestionsByBatch(batchId);

  let orderIndex = 0;
  let totalScore = 0;

  for (const setting of activeSettings) {
    // 4. Fetch questions from archives filtered by type + difficulties
    const diffs = (setting.include_difficulties ?? ["easy", "medium", "hard", "very_hard"]).filter(Boolean) as ("easy" | "medium" | "hard" | "very_hard")[];
    const { data: rawQuestions, error } = await supabase
      .from("archive_questions")
      .select("*, archive_options(*)")
      .in("archive_id", archiveIds)
      .eq("question_type", setting.question_type)
      .in("difficulty", diffs);

    if (error) throw error;
    const pool = (rawQuestions ?? []) as unknown as ArchiveQuestionWithOptions[];
    if (pool.length === 0) continue;

    // 5. Shuffle and pick
    const shuffled = shuffleArray([...pool]);
    const selected = shuffled.slice(0, setting.count);

    for (const aq of selected) {
      // 6. Insert into questions table linked to this batch
      const { data: newQ, error: qErr } = await supabase
        .from("questions")
        .insert({
          batch_id: batchId,
          question_text: aq.question_text,
          question_type: aq.question_type,
          category: aq.category ?? null,
          difficulty: aq.difficulty === "very_hard" ? "hard" : aq.difficulty,
          points: setting.points_per_question,
          order_index: orderIndex++,
        })
        .select()
        .single();
      if (qErr) throw qErr;

      // 7. Insert options
      if (aq.archive_options && aq.archive_options.length > 0) {
        const { error: oErr } = await supabase.from("options").insert(
          aq.archive_options.map((o) => ({
            question_id: newQ.id,
            option_text: o.option_text,
            option_label: o.option_label,
            is_correct: o.is_correct,
          }))
        );
        if (oErr) throw oErr;
      }
      totalScore += setting.points_per_question;
    }
  }

  return { total: orderIndex, totalScore };
}

// Count available questions per type from selected archives (for UI feedback)
export async function countArchiveQuestionsByType(
  archiveIds: string[],
  difficulties: ("easy" | "medium" | "hard" | "very_hard")[]
): Promise<Record<string, number>> {
  if (archiveIds.length === 0) return {};
  const { data, error } = await supabase
    .from("archive_questions")
    .select("question_type")
    .in("archive_id", archiveIds)
    .in("difficulty", difficulties);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const t = (row as { question_type: string }).question_type;
    counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}


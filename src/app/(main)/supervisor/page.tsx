"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuthStore } from "@/store/authStore";
import { gradeEssay } from "@/services/examService";
import { supabase } from "@/lib/supabase";

interface EssayTask {
  answer_id: string;
  question_id: string;
  question_text: string;
  question_points: number;
  essay_text: string | null;
  essay_graded: boolean;
  graded_score: number | null;
  participant_id: string;
  participant_name: string;
  batch_id: string;
  batch_name: string;
}

export default function SupervisorPage() {
  const router = useRouter();
  const { participant } = useAuthStore();
  const [tasks, setTasks] = useState<EssayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [filterGraded, setFilterGraded] = useState<"ungraded" | "all">("ungraded");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("answers")
        .select(`
          id,
          question_id,
          essay_text,
          essay_graded,
          graded_score,
          participant_id,
          batch_id,
          questions (question_text, points),
          participants!participant_id (name, area),
          batches (name)
        `)
        .not("essay_text", "is", null);

      if (error) throw error;

      // If supervisor has an area, filter to only their area. Admin (no area) sees all.
      const flat: EssayTask[] = ((data as unknown[]) ?? [])
        .filter((row: unknown) => {
          const r = row as Record<string, unknown>;
          if (!r.essay_text) return false;
          if (participant?.area) {
            const p = r.participants as Record<string, unknown> | null;
            return p?.area === participant.area;
          }
          return true;
        })
        .map((row: unknown) => {
          const r = row as Record<string, unknown>;
          const q = r.questions as Record<string, unknown>;
          const p = r.participants as Record<string, unknown>;
          const b = r.batches as Record<string, unknown>;
          return {
            answer_id: r.id as string,
            question_id: r.question_id as string,
            question_text: q?.question_text as string,
            question_points: q?.points as number,
            essay_text: r.essay_text as string | null,
            essay_graded: r.essay_graded as boolean,
            graded_score: r.graded_score as number | null,
            participant_id: r.participant_id as string,
            participant_name: p?.name as string,
            batch_id: r.batch_id as string,
            batch_name: b?.name as string,
          };
        });

      setTasks(flat);
    } finally {
      setLoading(false);
    }
  }, [participant?.area]);

  useEffect(() => {
    // Auth guard — only supervisor or admin
    if (participant && participant.role !== "supervisor" && participant.role !== "admin") {
      router.replace("/");
      return;
    }
    loadTasks();
  }, [participant, router, loadTasks]);

  // Realtime subscription for live grading updates
  useEffect(() => {
    const channel = supabase
      .channel("supervisor-essay-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "answers" },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTasks]);

  const handleGrade = async (answerId: string, maxPoints: number) => {
    const raw = scoreInputs[answerId];
    const score = parseFloat(raw ?? "0");
    if (isNaN(score) || score < 0 || score > maxPoints) {
      alert(`Skor harus antara 0 dan ${maxPoints}`);
      return;
    }
    setSavingId(answerId);
    try {
      await gradeEssay({ answerId, score, gradedBy: participant!.id });
      setSuccessMsg("Nilai berhasil disimpan!");
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan nilai");
    } finally {
      setSavingId(null);
    }
  };

  if (!participant) return <LoadingSpinner text="Loading..." />;

  const displayedTasks = filterGraded === "ungraded"
    ? tasks.filter((t) => !t.essay_graded)
    : tasks;

  const ungradedCount = tasks.filter((t) => !t.essay_graded).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Essay Grading</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Area: <span className="text-primary font-bold">{participant.area ?? "—"}</span>
            {" · "}{ungradedCount} belum dinilai · {tasks.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {(["ungraded", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterGraded(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                filterGraded === f
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {f === "ungraded" ? "Belum dinilai" : "Semua"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-tertiary-container rounded-lg text-on-tertiary-container text-sm font-medium flex items-center gap-2"
          >
            <MaterialIcon name="check_circle" className="text-lg" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <LoadingSpinner text="Memuat essay..." />
      ) : displayedTasks.length === 0 ? (
        <div className="bg-white rounded-xl bubbly-shadow p-10 text-center">
          <MaterialIcon name="task_alt" className="text-5xl text-tertiary mb-3" />
          <p className="text-on-surface font-bold text-lg">
            {filterGraded === "ungraded" ? "Semua essay sudah dinilai!" : "Belum ada essay di area ini."}
          </p>
          <p className="text-on-surface-variant text-sm mt-1">
            {filterGraded === "ungraded" && tasks.length > 0
              ? `${tasks.length} essay sudah dinilai. Pilih "Semua" untuk melihat.`
              : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedTasks.map((task) => (
            <motion.div
              key={task.answer_id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl bubbly-shadow p-5 border-l-4 ${
                task.essay_graded ? "border-tertiary" : "border-primary"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-on-surface text-sm">{task.participant_name}</p>
                  <p className="text-on-surface-variant text-xs">{task.batch_name}</p>
                </div>
                {task.essay_graded && (
                  <span className="bg-tertiary-container text-on-tertiary-container text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">
                    ✓ {task.graded_score}/{task.question_points} poin
                  </span>
                )}
              </div>

              <div className="mb-3">
                <p className="text-on-surface-variant text-xs font-medium mb-1 uppercase tracking-wide">Pertanyaan</p>
                <p className="text-on-surface text-sm">{task.question_text}</p>
              </div>

              <div className="mb-4">
                <p className="text-on-surface-variant text-xs font-medium mb-1 uppercase tracking-wide">Jawaban Peserta</p>
                <div className="bg-surface-container-low rounded-lg p-3 text-sm text-on-surface whitespace-pre-wrap">
                  {task.essay_text ?? <span className="italic text-on-surface-variant">Tidak ada jawaban</span>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-on-surface-variant text-xs font-medium mb-1">
                    Nilai (0 – {task.question_points})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={task.question_points}
                    step={0.5}
                    value={scoreInputs[task.answer_id] ?? (task.graded_score ?? "")}
                    onChange={(e) =>
                      setScoreInputs((prev) => ({ ...prev, [task.answer_id]: e.target.value }))
                    }
                    className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-2 text-on-surface text-sm focus:border-primary focus:outline-none transition-colors"
                    placeholder="0"
                  />
                </div>
                <button
                  onClick={() => handleGrade(task.answer_id, task.question_points)}
                  disabled={savingId === task.answer_id}
                  className="mt-5 px-5 py-2 bg-primary text-on-primary font-bold text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {savingId === task.answer_id ? (
                    <span className="animate-spin text-lg">⏳</span>
                  ) : (
                    <MaterialIcon name="save" className="text-lg" />
                  )}
                  Simpan Nilai
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

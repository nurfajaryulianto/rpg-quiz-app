"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import type { Batch, ExamSession } from "@/lib/database.types";

function QuestsPage() {
  const router = useRouter();
  const { participant } = useAuthStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sessions, setSessions] = useState<Map<string, ExamSession>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "completed">("all");

  useEffect(() => {
    if (!participant) {
      setLoading(false);
      return;
    }

    // Capture a stable non-null reference; TypeScript doesn't narrow across async closures.
    const p = participant;
    const controller = new AbortController();
    // Safety net: if the fetch hangs (stale TCP connection after idle), abort after 12s.
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    async function loadData() {
      try {
        const [batchRes, sessionRes, assignedRes] = await Promise.all([
          supabase.from("batches").select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .abortSignal(controller.signal),
          supabase.from("exam_sessions").select("*")
            .eq("participant_id", p.id)
            .abortSignal(controller.signal),
          p.role === "admin"
            ? Promise.resolve({ data: null })
            : supabase.from("batch_participants").select("batch_id")
                .eq("participant_id", p.id)
                .abortSignal(controller.signal),
        ]);

        clearTimeout(timeoutId);

        // Filter batches client-side by time window (avoids PostgREST .or() datetime parsing edge cases)
        const now = new Date();
        let allBatches = (batchRes.data ?? []).filter((b: Batch) => {
          if (b.start_time && new Date(b.start_time) > now) return false;
          if (b.end_time && new Date(b.end_time) < now) return false;
          return true;
        });

        // Regular users only see batches they are assigned to
        if (p.role !== "admin" && assignedRes.data) {
          const assignedIds = new Set((assignedRes.data as { batch_id: string }[]).map((r) => r.batch_id));
          allBatches = allBatches.filter((b) => assignedIds.has(b.id));
        }

        setBatches(allBatches);
        const sessionMap = new Map<string, ExamSession>();
        (sessionRes.data ?? []).forEach((s: ExamSession) => sessionMap.set(s.batch_id, s));
        setSessions(sessionMap);
      } catch {
        // AbortError (timeout) or network error — show empty state rather than spinning forever
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [participant]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading exams..." />
      </div>
    );
  }

  const filteredBatches = batches.filter((b) => {
    const session = sessions.get(b.id);
    if (filter === "available") return !session || session.status === "in_progress";
    if (filter === "completed") return session && session.status !== "in_progress";
    return true;
  });

  const getQuestStatus = (batch: Batch) => {
    const session = sessions.get(batch.id);
    if (!session) return { tag: "New", color: "tertiary", progress: 0 };
    if (session.status === "completed") return { tag: "Completed", color: "primary", progress: 100 };
    if (session.status === "timed_out") return { tag: "Timed Out", color: "secondary", progress: 100 };
    return { tag: "In Progress", color: "tertiary", progress: 50 };
  };

  const icons = ["shield", "science", "magic_button", "swords", "backpack", "auto_stories", "foundation", "rocket_launch"];

  return (
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-widest text-xs">
            <MaterialIcon name="auto_stories" className="text-sm" />
            Active Missions
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight">Available Exams</h1>
          <p className="text-on-surface-variant max-w-lg">
            Embark on legendary training missions to level up your professional skills and earn rare academy badges.
          </p>
        </div>
        <div className="flex bg-surface-container-low p-1.5 rounded-full shadow-inner border border-outline-variant/10">
          {(["all", "available", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-full font-bold transition-all capitalize ${
                filter === f
                  ? "bg-gradient-to-br from-primary to-primary-container text-white shadow-md transform active:scale-95"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredBatches.length === 0 ? (
        <div className="text-center py-20">
          <MaterialIcon name="search_off" className="text-6xl text-outline-variant mb-4" />
          <p className="text-on-surface-variant font-medium text-lg">No exams found</p>
          <p className="text-on-surface-variant text-sm">
            {filter !== "all" ? "Try changing your filter." : "No active exams available right now. Check back later!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredBatches.map((batch, i) => {
            const status = getQuestStatus(batch);
            const iconName = icons[i % icons.length];
            const session = sessions.get(batch.id);
            const isCompleted = session && session.status !== "in_progress";

            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.1, 0.5) }}
                className="group relative bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_40px_0_rgba(74,33,53,0.06)] transition-all duration-300 border border-transparent hover:border-primary-container/30 hover:-translate-y-2 cursor-pointer"
                onClick={() => {
                  if (isCompleted) {
                    router.push(`/review/${batch.id}`);
                  } else {
                    router.push(`/exam/${batch.id}`);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-surface-container-high rounded-lg flex items-center justify-center shadow-inner">
                    <MaterialIcon name={iconName} className="text-4xl text-primary" fill />
                  </div>
                  <span className={`px-3 py-1 bg-${status.color}-container text-on-${status.color}-container text-xs font-black rounded-full uppercase`}>
                    {status.tag}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-on-surface mb-2 group-hover:text-primary transition-colors">
                  {batch.name}
                </h3>
                <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">
                  {batch.description ?? "Begin this exam to earn XP and prove your knowledge!"}
                </p>

                {/* Progress */}
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-xs font-bold uppercase text-on-surface-variant mb-1">
                    <span>Exam Progress</span>
                    <span>{status.progress}%</span>
                  </div>
                  <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden relative shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-tertiary to-tertiary-fixed rounded-full"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-surface-container">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="timer" className="text-on-surface-variant text-sm" />
                    <span className="font-bold text-on-surface-variant text-xs">{batch.time_limit_seconds}s/q</span>
                  </div>
                  {session && isCompleted ? (
                    <div className="flex items-center gap-2">
                      <MaterialIcon name="stars" className="text-secondary-fixed-dim" />
                      <span className="font-black text-rose-900">{session.score} pts</span>
                    </div>
                  ) : (
                    <button className="text-primary font-extrabold flex items-center gap-1 hover:gap-2 transition-all">
                      {session ? "Resume" : "Start"} <MaterialIcon name="arrow_forward_ios" className="text-sm" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function QuestsPageWrapper() {
  return <QuestsPage />;
}

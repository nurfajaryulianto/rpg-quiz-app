"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getBatches,
  getExamSessions,
  resetBatchResults,
} from "@/services/adminService";
import type { Batch, ExamSession } from "@/lib/database.types";

type SessionWithNames = ExamSession & {
  participant_name?: string;
  batch_name?: string;
};

export default function ResultsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadBatches = useCallback(async () => {
    try {
      const data = await getBatches();
      setBatches(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const loadSessions = useCallback(async (batchId?: string) => {
    setLoadingSessions(true);
    try {
      const data = await getExamSessions(batchId || undefined);
      setSessions(data);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      loadSessions(selectedBatchId || undefined);
    }
  }, [selectedBatchId, loading, loadSessions]);

  const handleResetResults = async () => {
    if (!selectedBatchId) return;
    const batchName = batches.find((b) => b.id === selectedBatchId)?.name ?? "";
    if (!confirm(`Reset ALL results for "${batchName}"? This will delete all participant answers and exam sessions. This cannot be undone.`)) return;
    try {
      await resetBatchResults(selectedBatchId);
      await loadSessions(selectedBatchId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset");
    }
  };

  const filteredSessions = searchQuery
    ? sessions.filter(
        (s) =>
          (s.participant_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.batch_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  // Compute stats
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const inProgressSessions = sessions.filter((s) => s.status === "in_progress").length;
  const timedOutSessions = sessions.filter((s) => s.status === "timed_out").length;
  const avgScore =
    completedSessions > 0
      ? Math.round(
          sessions
            .filter((s) => s.status === "completed")
            .reduce((sum, s) => sum + s.score, 0) / completedSessions
        )
      : 0;
  const highestScore =
    sessions.length > 0
      ? Math.max(...sessions.map((s) => s.score))
      : 0;

  if (loading) return <LoadingSpinner text="Loading..." />;

  const statCards = [
    { label: "Total", value: totalSessions, icon: "edit_note" },
    { label: "Completed", value: completedSessions, icon: "check_circle" },
    { label: "In Progress", value: inProgressSessions, icon: "hourglass_top" },
    { label: "Timed Out", value: timedOutSessions, icon: "timer_off" },
    { label: "Avg Score", value: avgScore, icon: "star" },
    { label: "Highest", value: highestScore, icon: "emoji_events" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-on-surface tracking-tight mb-2">Results & Monitoring</h1>
      <p className="text-on-surface-variant text-sm mb-8">Track exam sessions and hero performance</p>

      {/* Batch Filter */}
      <div className="bg-white rounded-xl bubbly-shadow p-5 mb-8">
        <label className="block text-on-surface-variant text-sm font-medium mb-2">Filter by Batch</label>
        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
        >
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.is_active ? "(Active)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Overview */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl bubbly-shadow p-5 text-center">
            <MaterialIcon name={s.icon} className="text-2xl text-primary mb-1" />
            <div className="text-2xl font-black text-on-surface">{s.value}</div>
            <div className="text-on-surface-variant text-xs">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex gap-3 items-center">
          <h3 className="text-on-surface-variant text-sm font-medium">
            {sessions.length} result{sessions.length !== 1 ? "s" : ""}
            {searchQuery && ` (${filteredSessions.length} matching)`}
          </h3>
          {selectedBatchId && sessions.length > 0 && (
            <button
              onClick={handleResetResults}
              className="px-3 py-1.5 bg-error-container/20 text-error text-xs font-bold rounded-lg hover:bg-error-container/30 transition-colors flex items-center gap-1"
            >
              <MaterialIcon name="restart_alt" className="text-sm" />
              Reset Results
            </button>
          )}
        </div>
        {sessions.length > 3 && (
          <div className="relative w-full md:w-72">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or batch..."
              className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg pl-10 pr-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* Results Table */}
      {loadingSessions ? (
        <LoadingSpinner text="Loading results..." />
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white rounded-xl bubbly-shadow p-8 text-center">
          <MaterialIcon name="analytics" className="text-5xl text-outline-variant mb-3" />
          <p className="text-on-surface-variant">
            {searchQuery
              ? "No results match your search."
              : "No exam results yet. Participants need to take quizzes first."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl bubbly-shadow overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-8 gap-2 px-6 py-3 bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase">
            <span>#</span>
            <span className="col-span-2">Hero</span>
            <span>Batch</span>
            <span>Score</span>
            <span>XP</span>
            <span>Streak</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-surface-container">
            {filteredSessions.map((s, idx) => (
              <div key={s.id} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-center px-6 py-4 hover:bg-surface-container-low/50 transition-colors">
                <span className="text-primary font-bold text-xs">{idx + 1}</span>
                <div className="col-span-2">
                  <p className="font-bold text-sm text-on-surface">{s.participant_name}</p>
                  <p className="text-on-surface-variant text-xs">
                    {s.started_at ? new Date(s.started_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "-"}
                  </p>
                </div>
                <span className="text-sm text-on-surface-variant">{s.batch_name}</span>
                <span className="text-sm text-primary font-bold">{s.score}</span>
                <span className="text-sm text-tertiary font-medium">{s.total_xp}</span>
                <span className="text-sm">
                  {s.max_streak > 0 ? (
                    <span className="text-secondary font-bold flex items-center gap-0.5">
                      <MaterialIcon name="local_fire_department" className="text-sm" /> {s.max_streak}
                    </span>
                  ) : (
                    <span className="text-on-surface-variant">-</span>
                  )}
                </span>
                <span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    s.status === "completed"
                      ? "bg-tertiary-container text-on-tertiary-container"
                      : s.status === "timed_out"
                      ? "bg-error-container/20 text-error"
                      : "bg-secondary-container text-on-secondary-container"
                  }`}>
                    {s.status === "completed"
                      ? "Done"
                      : s.status === "timed_out"
                      ? "Timeout"
                      : "In Progress"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

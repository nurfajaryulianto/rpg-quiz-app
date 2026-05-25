"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getBatches,
  getExamSessions,
  resetBatchResults,
  getBatchExportData,
  getParticipantAnswers,
  exportBatchToGoogleSheets,
} from "@/services/adminService";
import type { Batch, ExamSession } from "@/lib/database.types";
import type { ParticipantAnswerDetail } from "@/services/adminService";

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
  const [exporting, setExporting] = useState(false);
  const [exportingSheets, setExportingSheets] = useState(false);
  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = useState("");
  const [showSheetsInput, setShowSheetsInput] = useState(false);

  // Drill-down state
  const [drillParticipant, setDrillParticipant] = useState<SessionWithNames | null>(null);
  const [drillAnswers, setDrillAnswers] = useState<ParticipantAnswerDetail[]>([]);
  const [loadingDrill, setLoadingDrill] = useState(false);

  const loadBatches = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await getBatches(signal);
      setBatches(data);
    } catch {
      // timeout/network error — loading cleared in finally
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    loadBatches(controller.signal);
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [loadBatches]);

  const loadSessions = useCallback(async (batchId?: string, signal?: AbortSignal) => {
    setLoadingSessions(true);
    try {
      const data = await getExamSessions(batchId, signal);
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    loadSessions(selectedBatchId || undefined, controller.signal);
    return () => { clearTimeout(timeoutId); controller.abort(); };
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

  const handleExport = async () => {
    if (!selectedBatchId) {
      alert("Please select a batch first");
      return;
    }
    setExporting(true);
    try {
      const rows = await getBatchExportData(selectedBatchId);
      const batchName = batches.find((b) => b.id === selectedBatchId)?.name ?? "results";

      const wsData = [
        ["No", "Peserta", "Batch", "Score", "XP", "Max Streak", "Status", "Mulai", "Selesai", "Durasi (menit)", "Jawaban Benar", "Total Soal", "Akurasi (%)"],
        ...rows.map((r) => [
          r.no,
          r.participant,
          r.batch,
          r.score,
          r.xp,
          r.maxStreak,
          r.status,
          r.startedAt,
          r.finishedAt,
          r.durationMinutes,
          r.correctAnswers,
          r.totalQuestions,
          r.accuracyPercent,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws["!cols"] = [
        { wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 8 },
        { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 18 },
        { wch: 15 }, { wch: 12 }, { wch: 14 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");
      XLSX.writeFile(wb, `${batchName.replace(/\s+/g, "_")}_results.xlsx`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportToSheets = async () => {
    if (!selectedBatchId) {
      alert("Please select a batch first");
      return;
    }
    setExportingSheets(true);
    try {
      const { url } = await exportBatchToGoogleSheets(selectedBatchId, sheetsSpreadsheetId || undefined);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export to Sheets failed");
    } finally {
      setExportingSheets(false);
    }
  };

  const handleDrillDown = async (session: SessionWithNames) => {
    setDrillParticipant(session);
    setLoadingDrill(true);
    try {
      const answers = await getParticipantAnswers(
        session.participant_id,
        session.batch_id
      );
      setDrillAnswers(answers);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load answers");
    } finally {
      setLoadingDrill(false);
    }
  };

  const filteredSessions = searchQuery
    ? sessions.filter(
        (s) =>
          (s.participant_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.batch_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const inProgressSessions = sessions.filter((s) => s.status === "in_progress").length;
  const timedOutSessions = sessions.filter((s) => s.status === "timed_out").length;
  const avgScore =
    completedSessions > 0
      ? Math.round(
          sessions.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.score, 0) / completedSessions
        )
      : 0;
  const highestScore = sessions.length > 0 ? Math.max(...sessions.map((s) => s.score)) : 0;

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
      <p className="text-on-surface-variant text-sm mb-8">Track exam sessions and export results</p>

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
        <div className="flex gap-3 items-center flex-wrap">
          <h3 className="text-on-surface-variant text-sm font-medium">
            {sessions.length} result{sessions.length !== 1 ? "s" : ""}
            {searchQuery && ` (${filteredSessions.length} matching)`}
          </h3>
          {selectedBatchId && sessions.length > 0 && (
            <>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-1.5 bg-tertiary-container text-on-tertiary-container text-xs font-bold rounded-lg hover:opacity-80 transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <MaterialIcon name="download" className="text-sm" />
                {exporting ? "Exporting..." : "Export Excel"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSheetsInput(!showSheetsInput)}
                  disabled={exportingSheets}
                  className="px-4 py-1.5 bg-green-100 text-green-800 text-xs font-bold rounded-lg hover:opacity-80 transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  <MaterialIcon name="table_chart" className="text-sm" />
                  {exportingSheets ? "Exporting..." : "Export to Sheets"}
                </button>
                {showSheetsInput && (
                  <>
                    <input
                      type="text"
                      value={sheetsSpreadsheetId}
                      onChange={(e) => setSheetsSpreadsheetId(e.target.value)}
                      placeholder="Spreadsheet ID (opsional)"
                      className="border border-outline-variant/30 rounded-lg px-2 py-1.5 text-xs w-48 focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={handleExportToSheets}
                      disabled={exportingSheets}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:opacity-80 disabled:opacity-50"
                    >
                      {exportingSheets ? "..." : "Go"}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={handleResetResults}
                className="px-3 py-1.5 bg-error-container/20 text-error text-xs font-bold rounded-lg hover:bg-error-container/30 transition-colors flex items-center gap-1"
              >
                <MaterialIcon name="restart_alt" className="text-sm" />
                Reset Results
              </button>
            </>
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
          <div className="hidden md:grid grid-cols-9 gap-2 px-6 py-3 bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase">
            <span>#</span>
            <span className="col-span-2">Hero</span>
            <span>Batch</span>
            <span>Score</span>
            <span>XP</span>
            <span>Streak</span>
            <span>Status</span>
            <span>Detail</span>
          </div>

          <div className="divide-y divide-surface-container">
            {filteredSessions.map((s, idx) => (
              <div key={s.id} className="grid grid-cols-1 md:grid-cols-9 gap-2 items-center px-6 py-4 hover:bg-surface-container-low/50 transition-colors">
                <span className="text-primary font-bold text-xs">{idx + 1}</span>
                <div className="col-span-2">
                  <p className="font-bold text-sm text-on-surface">{s.participant_name}</p>
                  <p className="text-on-surface-variant text-xs">
                    {s.started_at
                      ? new Date(s.started_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                      : "-"}
                  </p>
                </div>
                <span className="text-sm text-on-surface-variant truncate">{s.batch_name}</span>
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
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === "completed"
                        ? "bg-tertiary-container text-on-tertiary-container"
                        : s.status === "timed_out"
                        ? "bg-error-container/20 text-error"
                        : "bg-secondary-container text-on-secondary-container"
                    }`}
                  >
                    {s.status === "completed" ? "Done" : s.status === "timed_out" ? "Timeout" : "In Progress"}
                  </span>
                </span>
                <button
                  onClick={() => handleDrillDown(s)}
                  className="px-2 py-1 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1 w-fit"
                >
                  <MaterialIcon name="visibility" className="text-sm" />
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drill-down Modal */}
      <AnimatePresence>
        {drillParticipant && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setDrillParticipant(null); }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Header */}
              <div className="p-6 border-b border-outline-variant/20 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-on-surface">{drillParticipant.participant_name}</h2>
                  <p className="text-on-surface-variant text-sm">
                    {drillParticipant.batch_name} &middot; Score: <span className="font-bold text-primary">{drillParticipant.score}</span>
                    &nbsp;&middot; XP: <span className="font-bold text-tertiary">+{drillParticipant.total_xp}</span>
                  </p>
                </div>
                <button
                  onClick={() => setDrillParticipant(null)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <MaterialIcon name="close" className="text-on-surface-variant" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-6">
                {loadingDrill ? (
                  <LoadingSpinner text="Loading answers..." />
                ) : drillAnswers.length === 0 ? (
                  <p className="text-on-surface-variant text-center py-8">No answers recorded for this participant.</p>
                ) : (
                  <div className="space-y-3">
                    {drillAnswers.map((a, idx) => (
                      <div
                        key={a.questionId}
                        className={`p-4 rounded-xl border-2 ${
                          a.isCorrect ? "border-tertiary/30 bg-tertiary-container/10" : "border-error/20 bg-error-container/10"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="text-xs font-bold text-on-surface-variant">Q{idx + 1}</span>
                            {a.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">{a.category}</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold capitalize ${
                              a.difficulty === "hard" ? "bg-error-container/30 text-error"
                              : a.difficulty === "easy" ? "bg-tertiary-container text-on-tertiary-container"
                              : "bg-secondary-container text-on-secondary-container"
                            }`}>{a.difficulty}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-on-surface-variant flex items-center gap-0.5">
                              <MaterialIcon name="timer" className="text-xs" /> {a.timeTakenSeconds}s
                            </span>
                            <span className={`text-sm font-black ${a.isCorrect ? "text-tertiary" : "text-error"}`}>
                              {a.isCorrect ? `+${a.pointsEarned}` : "0"}
                            </span>
                            <MaterialIcon
                              name={a.isCorrect ? "check_circle" : "cancel"}
                              className={`text-xl ${a.isCorrect ? "text-tertiary" : "text-error"}`}
                              fill
                            />
                          </div>
                        </div>
                        <p className="text-on-surface text-sm font-medium mb-2">{a.questionText}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
                          <div className={`px-2 py-1.5 rounded border ${a.isCorrect ? "border-tertiary bg-tertiary-container/20 font-bold text-on-tertiary-container" : "border-error/40 bg-error-container/20 text-error"}`}>
                            Jawaban: {a.selectedOptionText ?? "(tidak dijawab)"}
                          </div>
                          {!a.isCorrect && a.correctOptionText && (
                            <div className="px-2 py-1.5 rounded border border-tertiary bg-tertiary-container/20 font-bold text-on-tertiary-container">
                              Benar: {a.correctOptionText}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

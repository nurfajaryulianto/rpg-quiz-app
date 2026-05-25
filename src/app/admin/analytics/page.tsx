"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getBatches, getBatchAnalytics } from "@/services/adminService";
import type { Batch } from "@/lib/database.types";
import type { BatchAnalytics } from "@/services/adminService";

export default function AnalyticsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [analytics, setAnalytics] = useState<BatchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

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

  const loadAnalytics = useCallback(async (batchId: string, signal?: AbortSignal) => {
    if (!batchId) { setAnalytics(null); return; }
    setLoadingAnalytics(true);
    try {
      const data = await getBatchAnalytics(batchId, signal);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedBatchId) { setAnalytics(null); return; }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    loadAnalytics(selectedBatchId, controller.signal);
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [selectedBatchId, loadAnalytics]);

  const inputClasses =
    "w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors";

  if (loading) return <LoadingSpinner text="Loading..." />;

  const completionRate =
    analytics && analytics.totalParticipants > 0
      ? Math.round((analytics.completedCount / analytics.totalParticipants) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-black text-on-surface tracking-tight mb-2">Analytics</h1>
      <p className="text-on-surface-variant text-sm mb-8">In-depth question and batch performance analysis</p>

      {/* Batch Selector */}
      <div className="bg-white rounded-xl bubbly-shadow p-5 mb-8">
        <label className="block text-on-surface-variant text-sm font-medium mb-2">Select Batch</label>
        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className={inputClasses}
        >
          <option value="">-- Select a batch --</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.is_active ? "(Active)" : ""}
            </option>
          ))}
        </select>
      </div>

      {!selectedBatchId && (
        <div className="bg-white rounded-xl bubbly-shadow p-12 text-center">
          <MaterialIcon name="insights" className="text-6xl text-outline-variant mb-4" />
          <p className="text-on-surface-variant">Select a batch above to view analytics.</p>
        </div>
      )}

      {selectedBatchId && loadingAnalytics && <LoadingSpinner text="Crunching numbers..." />}

      {analytics && !loadingAnalytics && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Participants", value: analytics.totalParticipants, icon: "group" },
              { label: "Completed", value: `${analytics.completedCount} (${completionRate}%)`, icon: "check_circle" },
              { label: "Avg Score", value: analytics.avgScore, icon: "star" },
              { label: "Avg Accuracy", value: `${analytics.avgAccuracy}%`, icon: "target" },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-xl bubbly-shadow p-5 text-center">
                <MaterialIcon name={c.icon} className="text-2xl text-primary mb-1" />
                <div className="text-2xl font-black text-on-surface">{c.value}</div>
                <div className="text-on-surface-variant text-xs">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Difficulty Breakdown */}
          {analytics.difficultyBreakdown.length > 0 && (
            <div className="bg-white rounded-xl bubbly-shadow p-6">
              <h2 className="text-lg font-bold text-on-surface mb-5 flex items-center gap-2">
                <MaterialIcon name="bar_chart" className="text-primary" />
                Difficulty Breakdown
              </h2>
              <div className="space-y-3">
                {analytics.difficultyBreakdown.map((d) => {
                  const colorClass =
                    d.difficulty === "easy"
                      ? "bg-tertiary"
                      : d.difficulty === "hard"
                      ? "bg-error"
                      : "bg-secondary";
                  return (
                    <div key={d.difficulty} className="flex items-center gap-4">
                      <span className="w-14 text-xs font-bold capitalize text-on-surface-variant">{d.difficulty}</span>
                      <div className="flex-1 bg-surface-container-low rounded-full h-5 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${colorClass}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${d.accuracyRate}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs font-bold text-on-surface w-24 text-right">
                        {d.accuracyRate}% acc · {d.count}q
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {analytics.categoryAnalytics.length > 0 && (
            <div className="bg-white rounded-xl bubbly-shadow p-6">
              <h2 className="text-lg font-bold text-on-surface mb-5 flex items-center gap-2">
                <MaterialIcon name="category" className="text-primary" />
                Category Performance
              </h2>
              <div className="space-y-3">
                {[...analytics.categoryAnalytics]
                  .sort((a, b) => b.accuracyRate - a.accuracyRate)
                  .map((c) => (
                    <div key={c.category} className="flex items-center gap-4">
                      <span className="w-28 text-xs font-bold text-on-surface-variant truncate">{c.category ?? "Uncategorized"}</span>
                      <div className="flex-1 bg-surface-container-low rounded-full h-5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${c.accuracyRate}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs font-bold text-on-surface w-36 text-right">
                        {c.accuracyRate}% · {c.totalAttempts} attempts
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Per-Question Item Analysis */}
          <div className="bg-white rounded-xl bubbly-shadow p-6">
            <h2 className="text-lg font-bold text-on-surface mb-5 flex items-center gap-2">
              <MaterialIcon name="quiz" className="text-primary" />
              Per-Question Analysis
            </h2>
            {analytics.questionAnalytics.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-8">No answer data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-on-surface-variant text-xs uppercase border-b border-outline-variant/20">
                      <th className="text-left py-2 pr-4 font-bold">#</th>
                      <th className="text-left py-2 pr-4 font-bold">Question</th>
                      <th className="text-left py-2 pr-4 font-bold">Category</th>
                      <th className="text-left py-2 pr-4 font-bold">Difficulty</th>
                      <th className="text-right py-2 pr-4 font-bold">Attempts</th>
                      <th className="text-right py-2 pr-4 font-bold">Accuracy</th>
                      <th className="text-right py-2 font-bold">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.questionAnalytics.map((q, idx) => {
                      const accuracyColor =
                        q.accuracyRate >= 80
                          ? "text-tertiary"
                          : q.accuracyRate >= 50
                          ? "text-secondary"
                          : "text-error";
                      return (
                        <tr key={q.questionId} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50">
                          <td className="py-3 pr-4 text-on-surface-variant font-bold">{idx + 1}</td>
                          <td className="py-3 pr-4 max-w-xs">
                            <p className="text-on-surface font-medium line-clamp-2">{q.questionText}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-xs text-on-surface-variant">{q.category ?? "—"}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              q.difficulty === "hard"
                                ? "bg-error-container/30 text-error"
                                : q.difficulty === "easy"
                                ? "bg-tertiary-container text-on-tertiary-container"
                                : "bg-secondary-container text-on-secondary-container"
                            }`}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right text-on-surface-variant">{q.totalAttempts}</td>
                          <td className={`py-3 pr-4 text-right font-bold ${accuracyColor}`}>
                            {q.totalAttempts > 0 ? `${q.accuracyRate}%` : "—"}
                          </td>
                          <td className="py-3 text-right text-on-surface-variant">
                            {q.totalAttempts > 0 ? `${q.avgTimeTakenSeconds}s` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

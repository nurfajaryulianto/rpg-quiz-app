"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchStats,
  resetBatchResults,
} from "@/services/adminService";
import type { Batch, ExamSession } from "@/lib/database.types";

interface BatchForm {
  name: string;
  description: string;
  time_limit_seconds: number;
}

interface BatchStats {
  totalQuestions: number;
  totalSessions: number;
  avgAccuracy: number;
  avgScore: number;
  topScorers: (ExamSession & { participant_name?: string })[];
}

export default function BatchesPage() {
  const { participant } = useAuthStore();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [batchStats, setBatchStats] = useState<Record<string, BatchStats>>({});
  const [loadingStats, setLoadingStats] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BatchForm>();

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

  const toggleBatchStats = async (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
      return;
    }
    setExpandedBatch(batchId);
    if (!batchStats[batchId]) {
      setLoadingStats(batchId);
      try {
        const stats = await getBatchStats(batchId);
        setBatchStats((prev) => ({ ...prev, [batchId]: stats }));
      } finally {
        setLoadingStats(null);
      }
    }
  };

  const onSubmit = async (data: BatchForm) => {
    setSaving(true);
    try {
      if (editingId) {
        await updateBatch(editingId, data);
      } else {
        await createBatch({
          ...data,
          created_by: participant?.id,
        });
      }
      reset();
      setEditingId(null);
      setShowForm(false);
      await loadBatches();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (batch: Batch) => {
    setEditingId(batch.id);
    setValue("name", batch.name);
    setValue("description", batch.description ?? "");
    setValue("time_limit_seconds", batch.time_limit_seconds);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this batch? This will also delete all its questions and answers.")) return;
    try {
      await deleteBatch(id);
      await loadBatches();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleToggleActive = async (batch: Batch) => {
    try {
      await updateBatch(batch.id, { is_active: !batch.is_active });
      await loadBatches();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleResetResults = async (batchId: string, batchName: string) => {
    if (!confirm(`Reset ALL results for "${batchName}"? This will delete all participant answers and exam sessions for this batch. This cannot be undone.`)) return;
    try {
      await resetBatchResults(batchId);
      setBatchStats((prev) => {
        const next = { ...prev };
        delete next[batchId];
        return next;
      });
      setExpandedBatch(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset");
    }
  };

  const filteredBatches = searchQuery
    ? batches.filter(
        (b) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : batches;

  if (loading) return <LoadingSpinner text="Loading batches..." />;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Quest Management</h1>
          <p className="text-on-surface-variant text-sm mt-1">{batches.length} batches created</p>
        </div>
        <button
          onClick={() => {
            reset({ name: "", description: "", time_limit_seconds: 60 });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="px-5 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
        >
          <MaterialIcon name={showForm ? "close" : "add_circle"} className="text-lg" />
          {showForm ? "Cancel" : "New Batch"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="bg-white rounded-xl bubbly-shadow p-6 mb-8 border border-primary/10">
            <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <MaterialIcon name={editingId ? "edit" : "add_circle"} className="text-primary" />
              {editingId ? "Edit Batch" : "Create New Batch"}
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-on-surface-variant text-sm font-medium mb-1">Name</label>
                <input
                  {...register("name", { required: "Name is required" })}
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  placeholder="Quiz Batch Name"
                />
                {errors.name && <p className="text-error text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-on-surface-variant text-sm font-medium mb-1">Description</label>
                <textarea
                  {...register("description")}
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant text-sm font-medium mb-1">
                  Time per question (seconds)
                </label>
                <input
                  type="number"
                  {...register("time_limit_seconds", {
                    required: "Required",
                    min: { value: 5, message: "Minimum 5 seconds" },
                    max: { value: 300, message: "Maximum 300 seconds" },
                    valueAsNumber: true,
                  })}
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
                />
                {errors.time_limit_seconds && (
                  <p className="text-error text-xs mt-1">{errors.time_limit_seconds.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </form>
          </div>
        </motion.div>
      )}

      {/* Search */}
      {batches.length > 3 && (
        <div className="mb-6">
          <div className="relative w-full md:w-72">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batches..."
              className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg pl-10 pr-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* Batch List */}
      {filteredBatches.length === 0 ? (
        <div className="bg-white rounded-xl bubbly-shadow p-8 text-center">
          <MaterialIcon name="inbox" className="text-5xl text-outline-variant mb-3" />
          <p className="text-on-surface-variant">
            {searchQuery ? "No batches match your search." : "No batches yet. Create your first one!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBatches.map((batch) => (
            <div key={batch.id}>
              <div className="bg-white rounded-xl bubbly-shadow p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
                        <MaterialIcon name="quiz" className="text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-on-surface">{batch.name}</h3>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              batch.is_active
                                ? "bg-tertiary-container text-on-tertiary-container"
                                : "bg-surface-container-high text-on-surface-variant"
                            }`}
                          >
                            {batch.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {batch.description && (
                          <p className="text-on-surface-variant text-sm mt-0.5">{batch.description}</p>
                        )}
                        <p className="text-on-surface-variant text-xs mt-1 flex items-center gap-1">
                          <MaterialIcon name="timer" className="text-sm" />
                          {batch.time_limit_seconds}s per question
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => toggleBatchStats(batch.id)}
                      className="px-3 py-1.5 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon name="analytics" className="text-sm" />
                      {expandedBatch === batch.id ? "Hide" : "Stats"}
                    </button>
                    <button
                      onClick={() => handleToggleActive(batch)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                        batch.is_active
                          ? "bg-error-container/20 text-error hover:bg-error-container/30"
                          : "bg-tertiary-container text-on-tertiary-container hover:opacity-80"
                      }`}
                    >
                      <MaterialIcon name={batch.is_active ? "pause_circle" : "play_circle"} className="text-sm" />
                      {batch.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleEdit(batch)}
                      className="px-3 py-1.5 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon name="edit" className="text-sm" />
                      Edit
                    </button>
                    <button
                      onClick={() => router.push(`/admin/questions`)}
                      className="px-3 py-1.5 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon name="help_outline" className="text-sm" />
                      Questions
                    </button>
                    <button
                      onClick={() => handleDelete(batch.id)}
                      className="px-3 py-1.5 bg-error-container/20 text-error text-xs font-bold rounded-lg hover:bg-error-container/30 transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon name="delete" className="text-sm" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Stats */}
              {expandedBatch === batch.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="ml-6 mt-3"
                >
                  {loadingStats === batch.id ? (
                    <LoadingSpinner text="Loading stats..." />
                  ) : batchStats[batch.id] ? (
                    <div className="bg-surface-container-lowest rounded-xl bubbly-shadow p-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        {[
                          { label: "Questions", value: batchStats[batch.id].totalQuestions, icon: "help_outline" },
                          { label: "Attempts", value: batchStats[batch.id].totalSessions, icon: "edit_note" },
                          { label: "Avg Accuracy", value: `${batchStats[batch.id].avgAccuracy}%`, icon: "target" },
                          { label: "Avg Score", value: batchStats[batch.id].avgScore, icon: "star" },
                        ].map((s) => (
                          <div key={s.label} className="bg-white rounded-lg p-4 text-center border border-outline-variant/10">
                            <MaterialIcon name={s.icon} className="text-primary text-xl mb-1" />
                            <div className="text-xl font-black text-on-surface">{s.value}</div>
                            <div className="text-on-surface-variant text-xs">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {batchStats[batch.id].topScorers.length > 0 && (
                        <>
                          <h4 className="font-bold text-on-surface text-sm mb-2 flex items-center gap-2">
                            <MaterialIcon name="emoji_events" className="text-primary" />
                            Top Scorers
                          </h4>
                          <div className="space-y-1">
                            {batchStats[batch.id].topScorers.map((s, i) => (
                              <div
                                key={s.id}
                                className="flex justify-between items-center px-4 py-2 bg-white rounded-lg border border-outline-variant/10 text-sm"
                              >
                                <span>
                                  <span className="text-primary font-bold">#{i + 1}</span>{" "}
                                  {s.participant_name}
                                </span>
                                <span className="text-primary font-bold">{s.score} pts</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <div className="mt-4 pt-3 border-t border-outline-variant/20">
                        <button
                          onClick={() => handleResetResults(batch.id, batch.name)}
                          className="px-4 py-2 bg-error-container/20 text-error text-xs font-bold rounded-lg hover:bg-error-container/30 transition-colors flex items-center gap-1"
                        >
                          <MaterialIcon name="restart_alt" className="text-sm" />
                          Reset All Results
                        </button>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

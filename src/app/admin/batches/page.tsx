"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  getParticipants,
  getBatchParticipants,
  addParticipantsToBatch,
  removeParticipantFromBatch,
  duplicateBatch,
} from "@/services/adminService";
import type { Batch, ExamSession, Participant } from "@/lib/database.types";

interface BatchForm {
  name: string;
  description: string;
  time_limit_seconds: number;
  randomize_questions: boolean;
  start_time: string;
  end_time: string;
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
  const [managingBatch, setManagingBatch] = useState<Batch | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [assignedParticipants, setAssignedParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");

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
      const payload = {
        name: data.name,
        description: data.description,
        time_limit_seconds: data.time_limit_seconds,
        randomize_questions: data.randomize_questions,
        start_time: data.start_time ? new Date(data.start_time).toISOString() : null,
        end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
      };
      if (editingId) {
        await updateBatch(editingId, payload);
      } else {
        await createBatch({ ...payload, created_by: participant?.id });
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
    setValue("randomize_questions", batch.randomize_questions ?? false);
    setValue("start_time", batch.start_time ? batch.start_time.slice(0, 16) : "");
    setValue("end_time", batch.end_time ? batch.end_time.slice(0, 16) : "");
    setShowForm(true);
  };

  const handleDuplicate = async (batchId: string) => {
    try {
      await duplicateBatch(batchId, participant?.id);
      await loadBatches();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to duplicate batch");
    }
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

  const openManageParticipants = async (batch: Batch) => {
    setManagingBatch(batch);
    setLoadingParticipants(true);
    setParticipantSearch("");
    try {
      const [all, assigned] = await Promise.all([
        getParticipants(),
        getBatchParticipants(batch.id),
      ]);
      setAllParticipants(all.filter((p) => p.role === "participant"));
      setAssignedParticipants(assigned);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load participants");
      setManagingBatch(null);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleAssignParticipant = async (participantId: string) => {
    if (!managingBatch) return;
    try {
      await addParticipantsToBatch(managingBatch.id, [participantId]);
      const p = allParticipants.find((p) => p.id === participantId);
      if (p) setAssignedParticipants((prev) => [...prev, p]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to assign");
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!managingBatch) return;
    try {
      await removeParticipantFromBatch(managingBatch.id, participantId);
      setAssignedParticipants((prev) => prev.filter((p) => p.id !== participantId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const handleAssignAll = async () => {
    if (!managingBatch) return;
    const unassignedIds = allParticipants
      .filter((p) => !assignedParticipants.some((ap) => ap.id === p.id))
      .map((p) => p.id);
    if (unassignedIds.length === 0) return;
    try {
      await addParticipantsToBatch(managingBatch.id, unassignedIds);
      setAssignedParticipants([...allParticipants]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to assign all");
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1 flex items-center gap-1">
                    <MaterialIcon name="event" className="text-sm" /> Exam Start Time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    {...register("start_time")}
                    className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  />
                  <p className="text-on-surface-variant text-xs mt-1">Leave blank to allow access any time</p>
                </div>
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1 flex items-center gap-1">
                    <MaterialIcon name="event_busy" className="text-sm" /> Exam End Time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    {...register("end_time")}
                    className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  />
                  <p className="text-on-surface-variant text-xs mt-1">Leave blank for no deadline</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                <input
                  type="checkbox"
                  id="randomize_questions"
                  {...register("randomize_questions")}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="randomize_questions" className="text-on-surface text-sm font-medium cursor-pointer flex-1">
                  Randomize question order per participant
                  <span className="block text-on-surface-variant text-xs font-normal">Each participant gets questions in a different order</span>
                </label>
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
                          {batch.randomize_questions && (
                            <span className="ml-1 px-1.5 py-0.5 bg-primary-container text-on-primary-container text-[10px] font-bold rounded-full">RANDOM</span>
                          )}
                        </p>
                        {(batch.start_time || batch.end_time) && (
                          <p className="text-on-surface-variant text-xs mt-0.5 flex items-center gap-1">
                            <MaterialIcon name="schedule" className="text-sm" />
                            {batch.start_time
                              ? new Date(batch.start_time).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                              : "Open"}{" "}
                            →{" "}
                            {batch.end_time
                              ? new Date(batch.end_time).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                              : "No deadline"}
                          </p>
                        )}
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
                      onClick={() => handleDuplicate(batch.id)}
                      className="px-3 py-1.5 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon name="content_copy" className="text-sm" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => router.push(`/admin/questions`)}
                      className="px-3 py-1.5 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon name="help_outline" className="text-sm" />
                      Questions
                    </button>
                    <button
                      onClick={() => openManageParticipants(batch)}
                      className="px-3 py-1.5 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-lg hover:opacity-80 transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon name="group_add" className="text-sm" />
                      Participants
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

      {/* Manage Participants Modal */}
      <AnimatePresence>
        {managingBatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setManagingBatch(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl bubbly-shadow w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-outline-variant/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
                    <MaterialIcon name="group_add" className="text-primary" />
                    Manage Participants
                  </h3>
                  <button
                    onClick={() => setManagingBatch(null)}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                  >
                    <MaterialIcon name="close" className="text-on-surface-variant" />
                  </button>
                </div>
                <p className="text-on-surface-variant text-sm">
                  Assign participants to <strong>{managingBatch.name}</strong>
                </p>

                {/* Search + Assign All */}
                <div className="flex gap-2 mt-4">
                  <div className="relative flex-1">
                    <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg" />
                    <input
                      type="text"
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      placeholder="Search participants..."
                      className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg pl-10 pr-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleAssignAll}
                    className="px-3 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap flex items-center gap-1"
                  >
                    <MaterialIcon name="group_add" className="text-sm" />
                    Add All
                  </button>
                </div>

                <p className="text-xs text-on-surface-variant mt-2">
                  {assignedParticipants.length} of {allParticipants.length} assigned
                </p>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingParticipants ? (
                  <LoadingSpinner text="Loading participants..." />
                ) : allParticipants.length === 0 ? (
                  <div className="text-center py-8">
                    <MaterialIcon name="person_off" className="text-4xl text-outline-variant mb-2" />
                    <p className="text-on-surface-variant text-sm">No participants found.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allParticipants
                      .filter((p) =>
                        participantSearch
                          ? p.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
                            p.email.toLowerCase().includes(participantSearch.toLowerCase())
                          : true
                      )
                      .map((p) => {
                        const isAssigned = assignedParticipants.some((ap) => ap.id === p.id);
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              isAssigned
                                ? "bg-tertiary-container/10 border-tertiary-container/30"
                                : "bg-white border-outline-variant/20 hover:border-primary/20"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                isAssigned ? "bg-tertiary-container" : "bg-surface-container-high"
                              }`}>
                                <MaterialIcon
                                  name={isAssigned ? "check" : "person"}
                                  className={`text-sm ${isAssigned ? "text-on-tertiary-container" : "text-on-surface-variant"}`}
                                />
                              </div>
                              <div>
                                <p className="font-bold text-on-surface text-sm">{p.name}</p>
                                <p className="text-on-surface-variant text-xs">{p.email}</p>
                              </div>
                            </div>
                            {isAssigned ? (
                              <button
                                onClick={() => handleRemoveParticipant(p.id)}
                                className="px-3 py-1.5 bg-error-container/20 text-error text-xs font-bold rounded-lg hover:bg-error-container/30 transition-colors"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAssignParticipant(p.id)}
                                className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
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

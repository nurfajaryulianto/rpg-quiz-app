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
  getArchives,
  getBatchArchiveIds,
  setBatchArchives,
  getBatchQuestionSettings,
  setBatchQuestionSettings,
  generateBatchQuestionsFromArchives,
  countArchiveQuestionsByType,
} from "@/services/adminService";
import type { Batch, ExamSession, Participant, QuestionArchive, BatchQuestionSetting } from "@/lib/database.types";

interface BatchForm {
  name: string;
  description: string;
  /** Duration in MINUTES (UI); converted to seconds for DB */
  duration_minutes: number;
  randomize_questions: boolean;
  start_time: string;
  end_time: string;
  passing_score: number;
  max_attempts: number;
  checkbox_options_count: number;
  show_results: boolean;
  show_answers_analysis: boolean;
  working_hours_only: boolean;
  reminder_before_start: boolean;
}

interface BatchStats {
  totalQuestions: number;
  totalSessions: number;
  avgAccuracy: number;
  avgScore: number;
  topScorers: (ExamSession & { participant_name?: string })[];
}

const QTYPES: Array<{ type: BatchQuestionSetting["question_type"]; label: string }> = [
  { type: "multiple_choice", label: "Pilihan Ganda" },
  { type: "true_false",      label: "Benar/Salah" },
  { type: "binary",          label: "Ya/Tidak" },
  { type: "checkbox",        label: "Checkbox" },
  { type: "essay",           label: "Essay" },
];

const DIFF_OPTIONS = [
  { value: "easy",      label: "Simple" },
  { value: "medium",    label: "Moderate" },
  { value: "hard",      label: "Difficult" },
  { value: "very_hard", label: "Very Difficult" },
];

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

  // ── Archive / question-settings state ──
  const [allArchives, setAllArchives] = useState<QuestionArchive[]>([]);
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<string[]>([]);
  const [questionSettings, setQuestionSettings] = useState<
    Array<{ question_type: BatchQuestionSetting["question_type"]; count: number; points_per_question: number; include_difficulties: string[] }>
  >(QTYPES.map((qt) => ({ question_type: qt.type, count: 0, points_per_question: 0, include_difficulties: ["easy","medium","hard","very_hard"] })));
  const [availableCounts, setAvailableCounts] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BatchForm>();

  const loadBatches = useCallback(async () => {
    try {
      const [data, archives] = await Promise.all([getBatches(), getArchives()]);
      setBatches(data);
      setAllArchives(archives);
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
        time_limit_seconds: Math.round((data.duration_minutes ?? 60) * 60),
        randomize_questions: data.randomize_questions,
        start_time: data.start_time ? new Date(data.start_time).toISOString() : null,
        end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
        passing_score: data.passing_score ?? 0,
        max_attempts: data.max_attempts ?? 1,
        checkbox_options_count: data.checkbox_options_count ?? 3,
        show_results: data.show_results ?? true,
        show_answers_analysis: data.show_answers_analysis ?? false,
        working_hours_only: data.working_hours_only ?? false,
        reminder_before_start: data.reminder_before_start ?? false,
      };

      let batchId = editingId;
      if (editingId) {
        await updateBatch(editingId, payload);
      } else {
        const created = await createBatch({ ...payload, created_by: participant?.id });
        batchId = created.id;
      }

      // Save archive links and question settings
      if (batchId) {
        await setBatchArchives(batchId, selectedArchiveIds);
        await setBatchQuestionSettings(batchId, questionSettings);
      }

      reset();
      setEditingId(null);
      setShowForm(false);
      setSelectedArchiveIds([]);
      setQuestionSettings(QTYPES.map((qt) => ({ question_type: qt.type, count: 0, points_per_question: 0, include_difficulties: ["easy","medium","hard","very_hard"] })));
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
    setValue("duration_minutes", Math.round(batch.time_limit_seconds / 60));
    setValue("randomize_questions", batch.randomize_questions ?? false);
    setValue("start_time", batch.start_time ? batch.start_time.slice(0, 16) : "");
    setValue("end_time", batch.end_time ? batch.end_time.slice(0, 16) : "");
    setValue("passing_score", batch.passing_score ?? 0);
    setValue("max_attempts", batch.max_attempts ?? 1);
    setValue("checkbox_options_count", batch.checkbox_options_count ?? 3);
    setValue("show_results", batch.show_results ?? true);
    setValue("show_answers_analysis", batch.show_answers_analysis ?? false);
    setValue("working_hours_only", batch.working_hours_only ?? false);
    setValue("reminder_before_start", batch.reminder_before_start ?? false);

    // Load archive links and question settings
    Promise.all([getBatchArchiveIds(batch.id), getBatchQuestionSettings(batch.id)]).then(([archiveIds, settings]) => {
      setSelectedArchiveIds(archiveIds);
      const merged = QTYPES.map((qt) => {
        const existing = settings.find((s) => s.question_type === qt.type);
        return {
          question_type: qt.type,
          count: existing?.count ?? 0,
          points_per_question: existing?.points_per_question ?? 0,
          include_difficulties: existing?.include_difficulties ?? ["easy","medium","hard","very_hard"],
        };
      });
      setQuestionSettings(merged);
      // Load available counts
      const allDiffs = ["easy","medium","hard","very_hard"];
      if (archiveIds.length > 0) {
        countArchiveQuestionsByType(archiveIds, allDiffs).then(setAvailableCounts);
      }
    });

    setShowForm(true);
  };

  const toggleArchiveSelection = (archiveId: string) => {
    setSelectedArchiveIds((prev) => {
      const next = prev.includes(archiveId) ? prev.filter((id) => id !== archiveId) : [...prev, archiveId];
      // Refresh available counts for selected difficulties
      const allDiffs = ["easy","medium","hard","very_hard"];
      if (next.length > 0) countArchiveQuestionsByType(next, allDiffs).then(setAvailableCounts);
      else setAvailableCounts({});
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!editingId) return;
    if (!confirm("Generate ulang soal dari bank soal? Soal yang sudah ada di batch ini akan diganti.")) return;
    setGenerating(true);
    try {
      const { total, totalScore } = await generateBatchQuestionsFromArchives(editingId);
      alert(`Berhasil generate ${total} soal dengan total skor ${totalScore}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal generate soal");
    } finally {
      setGenerating(false);
    }
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1">
                    Durasi Ujian (menit)
                  </label>
                  <input
                    type="number"
                    {...register("duration_minutes", {
                      required: "Wajib diisi",
                      min: { value: 1, message: "Min. 1 menit" },
                      max: { value: 480, message: "Maks. 8 jam" },
                      valueAsNumber: true,
                    })}
                    defaultValue={60}
                    className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  />
                  {errors.duration_minutes && <p className="text-error text-xs mt-1">{errors.duration_minutes.message}</p>}
                </div>
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1">
                    Nilai Kelulusan
                  </label>
                  <input
                    type="number"
                    {...register("passing_score", { valueAsNumber: true, min: 0 })}
                    defaultValue={0}
                    className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
                    placeholder="0 = tidak ada batas"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1">
                    Maks. Percobaan
                  </label>
                  <input
                    type="number"
                    {...register("max_attempts", { valueAsNumber: true, min: 1 })}
                    defaultValue={1}
                    className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant text-sm font-medium mb-1">
                  Jumlah Opsi per Soal Checkbox
                </label>
                <input
                  type="number"
                  {...register("checkbox_options_count", { valueAsNumber: true, min: 2, max: 8 })}
                  defaultValue={3}
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors"
                />
                <p className="text-on-surface-variant text-xs mt-1">Semua soal checkbox dalam batch ini harus memiliki jumlah opsi yang sama</p>
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
                  Acak urutan soal per peserta
                  <span className="block text-on-surface-variant text-xs font-normal">Setiap peserta mendapat urutan soal yang berbeda</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { id: "show_results", label: "Tampilkan nilai setelah ujian", desc: "Peserta dapat melihat skor mereka" },
                  { id: "show_answers_analysis", label: "Tampilkan pembahasan jawaban", desc: "Peserta dapat melihat jawaban benar/salah" },
                  { id: "working_hours_only", label: "Akses hanya jam kerja", desc: "Sen–Jum, 07:00–16:00 (waktu lokal browser)" },
                  { id: "reminder_before_start", label: "Kirim pengingat sebelum mulai", desc: "Fitur pengingat (belum aktif)" },
                ].map(({ id, label, desc }) => (
                  <div key={id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                    <input type="checkbox" id={id} {...register(id as keyof BatchForm)} className="w-4 h-4 accent-primary" />
                    <label htmlFor={id} className="text-on-surface text-sm font-medium cursor-pointer flex-1">
                      {label}
                      <span className="block text-on-surface-variant text-xs font-normal">{desc}</span>
                    </label>
                  </div>
                ))}
              </div>

              {/* ── Bank Soal (Question Archives) ── */}
              {allArchives.length > 0 && (
                <div className="border-t border-outline-variant/20 pt-5">
                  <h4 className="font-bold text-on-surface text-sm mb-1 flex items-center gap-2">
                    <MaterialIcon name="library_books" className="text-primary text-base" />
                    Bank Soal (Question Archives)
                  </h4>
                  <p className="text-on-surface-variant text-xs mb-3">Pilih bank soal yang akan digunakan untuk generate soal ke batch ini</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {allArchives.map((a) => {
                      const selected = selectedArchiveIds.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleArchiveSelection(a.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors flex items-center gap-1 ${
                            selected
                              ? "bg-primary text-on-primary border-primary"
                              : "bg-surface-container text-on-surface border-outline-variant/30 hover:border-primary/40"
                          }`}
                        >
                          {a.name}
                          {selected && <MaterialIcon name="close" className="text-sm" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Question settings table */}
                  {selectedArchiveIds.length > 0 && (
                    <div>
                      <h4 className="font-bold text-on-surface text-sm mb-2">Pengaturan Soal</h4>
                      <div className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/20">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-surface-container text-on-surface-variant text-xs font-bold uppercase">
                          <span className="col-span-3">Tipe Soal</span>
                          <span className="col-span-2 text-center">Jumlah</span>
                          <span className="col-span-2 text-center">Tersedia</span>
                          <span className="col-span-2 text-center">Poin/Soal</span>
                          <span className="col-span-3">Level</span>
                        </div>
                        {questionSettings.map((qs, idx) => (
                          <div key={qs.question_type} className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-outline-variant/10 items-center">
                            <span className="col-span-3 text-sm text-on-surface font-medium">{QTYPES.find((q) => q.type === qs.question_type)?.label}</span>
                            {/* Count input */}
                            <div className="col-span-2 flex items-center gap-1 justify-center">
                              <input
                                type="number" min={0}
                                value={qs.count}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value) || 0;
                                  setQuestionSettings((prev) => prev.map((s, i) => i === idx ? { ...s, count: v } : s));
                                }}
                                className="w-16 text-center bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg py-1.5 px-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                              />
                              <span className="text-xs text-on-surface-variant">/ {availableCounts[qs.question_type] ?? 0}</span>
                            </div>
                            {/* Available */}
                            <div className="col-span-2 text-center">
                              <span className={`text-xs font-bold ${(availableCounts[qs.question_type] ?? 0) > 0 ? "text-tertiary" : "text-outline-variant"}`}>
                                {availableCounts[qs.question_type] ?? 0} soal
                              </span>
                            </div>
                            {/* Points per question */}
                            <div className="col-span-2 flex justify-center">
                              <input
                                type="number" min={0}
                                value={qs.points_per_question}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0;
                                  setQuestionSettings((prev) => prev.map((s, i) => i === idx ? { ...s, points_per_question: v } : s));
                                }}
                                className="w-16 text-center bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg py-1.5 px-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                              />
                            </div>
                            {/* Difficulty filter */}
                            <div className="col-span-3 flex flex-wrap gap-1">
                              {DIFF_OPTIONS.map((d) => {
                                const checked = qs.include_difficulties.includes(d.value);
                                return (
                                  <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => {
                                      setQuestionSettings((prev) => prev.map((s, i) => {
                                        if (i !== idx) return s;
                                        const diffs = checked
                                          ? s.include_difficulties.filter((x) => x !== d.value)
                                          : [...s.include_difficulties, d.value];
                                        return { ...s, include_difficulties: diffs };
                                      }));
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                      checked ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                                    }`}
                                  >
                                    {d.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {/* Totals */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-surface-container border-t border-outline-variant/20">
                          <span className="col-span-3 text-xs font-bold text-on-surface-variant uppercase">Total</span>
                          <span className="col-span-2 text-center text-sm font-black text-primary">
                            {questionSettings.reduce((s, q) => s + q.count, 0)}
                          </span>
                          <span className="col-span-2" />
                          <span className="col-span-2 text-center text-sm font-black text-primary">
                            {questionSettings.reduce((s, q) => s + q.count * q.points_per_question, 0)}
                          </span>
                        </div>
                      </div>

                      {/* Generate button (only when editing) */}
                      {editingId && (
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={generating}
                          className="mt-3 w-full py-2.5 bg-tertiary-container text-on-tertiary-container font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                          <MaterialIcon name={generating ? "autorenew" : "generating_tokens"} className={`text-lg ${generating ? "animate-spin" : ""}`} />
                          {generating ? "Generating..." : "Generate Soal dari Bank Soal"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

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

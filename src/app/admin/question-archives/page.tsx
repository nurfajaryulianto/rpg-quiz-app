"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getArchives,
  createArchive,
  updateArchive,
  deleteArchive,
  getArchiveQuestions,
  createArchiveQuestion,
  updateArchiveQuestion,
  deleteArchiveQuestion,
} from "@/services/adminService";
import type { QuestionArchive, ArchiveQuestionWithOptions } from "@/lib/database.types";

type QType = "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
type Difficulty = "easy" | "medium" | "hard" | "very_hard";

interface ArchiveForm {
  name: string;
  description: string;
}

interface QuestionForm {
  question_text: string;
  question_type: QType;
  category: string;
  difficulty: Difficulty;
  default_points: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  option_f: string;
  correct_answer: "A" | "B" | "C" | "D";
  correct_a: boolean;
  correct_b: boolean;
  correct_c: boolean;
  correct_d: boolean;
  correct_e: boolean;
  correct_f: boolean;
}

const DIFFICULTY_LABEL: Record<Difficulty, { label: string; color: string }> = {
  easy:      { label: "Simple",       color: "bg-tertiary-container text-on-tertiary-container" },
  medium:    { label: "Moderate",     color: "bg-secondary-container text-on-secondary-container" },
  hard:      { label: "Difficult",    color: "bg-error-container/40 text-error" },
  very_hard: { label: "Very Difficult", color: "bg-error-container text-on-error-container" },
};

const QTYPE_LABEL: Record<QType, string> = {
  multiple_choice: "Pilihan Ganda",
  true_false: "Benar/Salah",
  binary: "Ya/Tidak",
  checkbox: "Checkbox",
  essay: "Essay",
};

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

export default function QuestionArchivesPage() {
  const [archives, setArchives] = useState<QuestionArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArchive, setSelectedArchive] = useState<QuestionArchive | null>(null);
  const [questions, setQuestions] = useState<ArchiveQuestionWithOptions[]>([]);
  const [loadingQs, setLoadingQs] = useState(false);

  // Archive form
  const [showArchiveForm, setShowArchiveForm] = useState(false);
  const [editingArchive, setEditingArchive] = useState<QuestionArchive | null>(null);
  const [savingArchive, setSavingArchive] = useState(false);
  const archiveForm = useForm<ArchiveForm>();

  // Question form
  const [showQForm, setShowQForm] = useState(false);
  const [editingQ, setEditingQ] = useState<ArchiveQuestionWithOptions | null>(null);
  const [savingQ, setSavingQ] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterDiff, setFilterDiff] = useState<string>("");

  const qForm = useForm<QuestionForm>({
    defaultValues: { question_type: "multiple_choice", difficulty: "medium", default_points: 10 },
  });
  const questionType = useWatch({ control: qForm.control, name: "question_type" });
  const isTF     = questionType === "true_false";
  const isBinary = questionType === "binary";
  const isCheckbox = questionType === "checkbox";
  const isEssay  = questionType === "essay";
  // Checkbox uses A-F (6 options max)
  const checkboxCount = 4;

  const loadArchives = useCallback(async () => {
    try { setArchives(await getArchives()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadArchives(); }, [loadArchives]);

  const loadQuestions = useCallback(async (archiveId: string) => {
    setLoadingQs(true);
    try { setQuestions(await getArchiveQuestions(archiveId)); }
    finally { setLoadingQs(false); }
  }, []);

  useEffect(() => {
    if (selectedArchive) loadQuestions(selectedArchive.id);
    else setQuestions([]);
  }, [selectedArchive, loadQuestions]);

  // ---- Archive CRUD ----
  const onSubmitArchive = async (data: ArchiveForm) => {
    setSavingArchive(true);
    try {
      if (editingArchive) {
        await updateArchive(editingArchive.id, { name: data.name, description: data.description });
      } else {
        await createArchive({ name: data.name, description: data.description });
      }
      archiveForm.reset();
      setShowArchiveForm(false);
      setEditingArchive(null);
      await loadArchives();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSavingArchive(false);
    }
  };

  const handleEditArchive = (a: QuestionArchive) => {
    setEditingArchive(a);
    archiveForm.setValue("name", a.name);
    archiveForm.setValue("description", a.description ?? "");
    setShowArchiveForm(true);
  };

  const handleDeleteArchive = async (a: QuestionArchive) => {
    if (!confirm(`Hapus bank soal "${a.name}"? Semua soal di dalamnya akan terhapus.`)) return;
    await deleteArchive(a.id);
    if (selectedArchive?.id === a.id) setSelectedArchive(null);
    await loadArchives();
  };

  // ---- Question CRUD ----
  const onSubmitQuestion = async (data: QuestionForm) => {
    if (!selectedArchive) return;
    setSavingQ(true);
    try {
      let options: { option_text: string; option_label: string; is_correct: boolean }[] = [];

      if (data.question_type === "true_false") {
        options = [
          { option_text: "Benar", option_label: "A", is_correct: data.correct_answer === "A" },
          { option_text: "Salah", option_label: "B", is_correct: data.correct_answer === "B" },
        ];
      } else if (data.question_type === "binary") {
        options = [
          { option_text: "Ya",    option_label: "A", is_correct: data.correct_answer === "A" },
          { option_text: "Tidak", option_label: "B", is_correct: data.correct_answer === "B" },
        ];
      } else if (data.question_type === "checkbox") {
        options = OPTION_LABELS.slice(0, checkboxCount).map((lbl) => ({
          option_text:  (data[`option_${lbl.toLowerCase()}` as keyof QuestionForm] as string) ?? "",
          option_label: lbl,
          is_correct:   (data[`correct_${lbl.toLowerCase()}` as keyof QuestionForm] as boolean) ?? false,
        }));
      } else if (data.question_type === "essay") {
        options = [];
      } else {
        options = (["A","B","C","D"] as const).map((lbl) => ({
          option_text:  (data[`option_${lbl.toLowerCase()}` as keyof QuestionForm] as string) ?? "",
          option_label: lbl,
          is_correct:   data.correct_answer === lbl,
        }));
      }

      const shared = {
        question_text: data.question_text,
        question_type: data.question_type,
        category: data.category?.trim() || null,
        difficulty: data.difficulty,
        default_points: data.default_points,
        options,
      };

      if (editingQ) {
        await updateArchiveQuestion(editingQ.id, shared);
      } else {
        await createArchiveQuestion(selectedArchive.id, { ...shared, order_index: questions.length });
      }

      qForm.reset({ question_type: "multiple_choice", difficulty: "medium", default_points: 10 });
      setShowQForm(false);
      setEditingQ(null);
      await loadQuestions(selectedArchive.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan soal");
    } finally {
      setSavingQ(false);
    }
  };

  const handleEditQ = (q: ArchiveQuestionWithOptions) => {
    setEditingQ(q);
    qForm.setValue("question_text", q.question_text);
    qForm.setValue("question_type", q.question_type as QType);
    qForm.setValue("category", q.category ?? "");
    qForm.setValue("difficulty", q.difficulty as Difficulty);
    qForm.setValue("default_points", q.default_points);

    if (q.question_type === "checkbox") {
      q.archive_options.forEach((o) => {
        const key = o.option_label.toLowerCase();
        qForm.setValue(`option_${key}` as keyof QuestionForm, o.option_text as never);
        qForm.setValue(`correct_${key}` as keyof QuestionForm, o.is_correct as never);
      });
    } else if (q.question_type !== "essay") {
      (["A","B","C","D"] as const).forEach((lbl) => {
        const opt = q.archive_options.find((o) => o.option_label === lbl);
        qForm.setValue(`option_${lbl.toLowerCase()}` as keyof QuestionForm, (opt?.option_text ?? "") as never);
      });
      const correct = q.archive_options.find((o) => o.is_correct);
      qForm.setValue("correct_answer", (correct?.option_label ?? "A") as "A"|"B"|"C"|"D");
    }
    setShowQForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteQ = async (id: string) => {
    if (!confirm("Hapus soal ini?")) return;
    await deleteArchiveQuestion(id);
    if (selectedArchive) await loadQuestions(selectedArchive.id);
  };

  const filteredQuestions = questions.filter((q) => {
    const matchSearch = !searchQuery || q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType   = !filterType || q.question_type === filterType;
    const matchDiff   = !filterDiff || q.difficulty === filterDiff;
    return matchSearch && matchType && matchDiff;
  });

  const inputCls = "w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors text-sm";
  const btnSec   = "px-3 py-1.5 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1";
  const btnDng   = "px-3 py-1.5 bg-error-container/20 text-error text-xs font-bold rounded-lg hover:bg-error-container/30 transition-colors flex items-center gap-1";

  if (loading) return <LoadingSpinner text="Loading..." />;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-on-surface tracking-tight mb-1">Bank Soal</h1>
      <p className="text-on-surface-variant text-sm mb-8">Kelola koleksi soal yang dapat digunakan di berbagai batch ujian</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Archive list ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl bubbly-shadow p-4 sticky top-24">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-on-surface text-sm">Daftar Bank Soal</h2>
              <button
                onClick={() => { setEditingArchive(null); archiveForm.reset(); setShowArchiveForm(!showArchiveForm); }}
                className="w-8 h-8 flex items-center justify-center bg-primary text-on-primary rounded-full hover:opacity-90 transition-opacity"
              >
                <MaterialIcon name={showArchiveForm && !editingArchive ? "close" : "add"} className="text-lg" />
              </button>
            </div>

            <AnimatePresence>
              {showArchiveForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={archiveForm.handleSubmit(onSubmitArchive)}
                  className="mb-4 space-y-2 overflow-hidden"
                >
                  <input
                    {...archiveForm.register("name", { required: true })}
                    className={inputCls}
                    placeholder="Nama bank soal"
                  />
                  <input
                    {...archiveForm.register("description")}
                    className={inputCls}
                    placeholder="Deskripsi (opsional)"
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingArchive}
                      className="flex-1 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
                      {savingArchive ? "Menyimpan..." : editingArchive ? "Update" : "Buat Bank Soal"}
                    </button>
                    {editingArchive && (
                      <button type="button" onClick={() => { setEditingArchive(null); setShowArchiveForm(false); }} className={btnSec}>
                        Batal
                      </button>
                    )}
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {archives.length === 0 ? (
              <p className="text-on-surface-variant text-xs text-center py-4">Belum ada bank soal</p>
            ) : (
              <div className="space-y-1">
                {archives.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedArchive(selectedArchive?.id === a.id ? null : a)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedArchive?.id === a.id
                        ? "bg-primary-container text-on-primary-container"
                        : "hover:bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-bold text-sm truncate">{a.name}</p>
                      {a.description && <p className="text-xs opacity-70 truncate">{a.description}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleEditArchive(a); }}
                        className="p-1 rounded hover:bg-black/10 transition-colors">
                        <MaterialIcon name="edit" className="text-sm" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteArchive(a); }}
                        className="p-1 rounded hover:bg-error/20 text-error transition-colors">
                        <MaterialIcon name="delete" className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Questions ── */}
        <div className="lg:col-span-2">
          {!selectedArchive ? (
            <div className="bg-white rounded-xl bubbly-shadow p-10 text-center">
              <MaterialIcon name="library_books" className="text-5xl text-outline-variant mb-3" />
              <p className="text-on-surface-variant">Pilih bank soal di sebelah kiri untuk mengelola soal-soalnya</p>
            </div>
          ) : (
            <>
              {/* Question form */}
              <div className="bg-white rounded-xl bubbly-shadow p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-bold text-on-surface">{selectedArchive.name}</h2>
                    <p className="text-on-surface-variant text-xs">{questions.length} soal tersedia</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingQ(null);
                      qForm.reset({ question_type: "multiple_choice", difficulty: "medium", default_points: 10 });
                      setShowQForm(!showQForm);
                    }}
                    className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <MaterialIcon name={showQForm && !editingQ ? "close" : "add_circle"} className="text-lg" />
                    {showQForm && !editingQ ? "Batal" : "Tambah Soal"}
                  </button>
                </div>

                <AnimatePresence>
                  {showQForm && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <form onSubmit={qForm.handleSubmit(onSubmitQuestion)} className="space-y-4 pt-4 border-t border-outline-variant/20">
                        <div>
                          <label className="block text-on-surface-variant text-xs font-medium mb-1">Teks Soal *</label>
                          <textarea
                            {...qForm.register("question_text", { required: true })}
                            rows={3}
                            className={inputCls}
                            placeholder="Tulis pertanyaan di sini..."
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-on-surface-variant text-xs font-medium mb-1">Tipe</label>
                            <select {...qForm.register("question_type")} className={inputCls}>
                              <option value="multiple_choice">Pilihan Ganda</option>
                              <option value="true_false">Benar/Salah</option>
                              <option value="binary">Ya/Tidak</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="essay">Essay</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-on-surface-variant text-xs font-medium mb-1">Tingkat</label>
                            <select {...qForm.register("difficulty")} className={inputCls}>
                              <option value="easy">Simple</option>
                              <option value="medium">Moderate</option>
                              <option value="hard">Difficult</option>
                              <option value="very_hard">Very Difficult</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-on-surface-variant text-xs font-medium mb-1">Kategori</label>
                            <input {...qForm.register("category")} className={inputCls} placeholder="Opsional" />
                          </div>
                          <div>
                            <label className="block text-on-surface-variant text-xs font-medium mb-1">Default Poin</label>
                            <input
                              type="number" min={0} {...qForm.register("default_points", { valueAsNumber: true })}
                              className={inputCls}
                            />
                          </div>
                        </div>

                        {/* Options section */}
                        {isEssay ? (
                          <p className="text-on-surface-variant text-xs italic p-3 bg-surface-container-low rounded-lg">
                            Soal essay tidak memiliki pilihan jawaban — penilaian dilakukan manual oleh supervisor.
                          </p>
                        ) : (isTF || isBinary) ? (
                          <div>
                            <label className="block text-on-surface-variant text-xs font-medium mb-2">Jawaban Benar</label>
                            <div className="flex gap-3">
                              {(["A", "B"] as const).map((v) => (
                                <label key={v} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-outline-variant/30 cursor-pointer text-sm">
                                  <input type="radio" value={v} {...qForm.register("correct_answer")} className="accent-primary" />
                                  <span className="font-bold">
                                    {isBinary ? (v === "A" ? "✓ Ya" : "✗ Tidak") : (v === "A" ? "✓ Benar" : "✗ Salah")}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : isCheckbox ? (
                          <div>
                            <label className="block text-on-surface-variant text-xs font-medium mb-2">
                              Pilihan & Jawaban Benar (centang semua yang benar)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {OPTION_LABELS.slice(0, checkboxCount).map((lbl) => (
                                <div key={lbl} className="flex items-center gap-2 p-2 bg-surface-container-low rounded-lg border border-outline-variant/20">
                                  <input type="checkbox" {...qForm.register(`correct_${lbl.toLowerCase()}` as keyof QuestionForm)} className="w-4 h-4 accent-primary" />
                                  <input
                                    {...qForm.register(`option_${lbl.toLowerCase()}` as keyof QuestionForm, { required: true })}
                                    className="flex-1 bg-transparent border-b border-outline-variant/40 py-1 text-sm text-on-surface focus:outline-none focus:border-primary"
                                    placeholder={`Opsi ${lbl}`}
                                  />
                                  <span className="text-xs font-bold text-on-surface-variant w-5">{lbl}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(["A","B","C","D"] as const).map((lbl) => (
                                <div key={lbl}>
                                  <label className="block text-on-surface-variant text-xs font-medium mb-1">Opsi {lbl}</label>
                                  <input {...qForm.register(`option_${lbl.toLowerCase()}` as keyof QuestionForm, { required: true })} className={inputCls} placeholder={`Opsi ${lbl}`} />
                                </div>
                              ))}
                            </div>
                            <div className="w-40">
                              <label className="block text-on-surface-variant text-xs font-medium mb-1">Jawaban Benar</label>
                              <select {...qForm.register("correct_answer")} className={inputCls}>
                                {(["A","B","C","D"] as const).map((l) => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                          </>
                        )}

                        <div className="flex gap-3">
                          <button type="submit" disabled={savingQ}
                            className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-50 text-sm">
                            {savingQ ? "Menyimpan..." : editingQ ? "Update Soal" : "Simpan Soal"}
                          </button>
                          {editingQ && (
                            <button type="button" onClick={() => { setEditingQ(null); setShowQForm(false); qForm.reset(); }} className={`${btnSec} py-2.5 px-5`}>
                              Batal Edit
                            </button>
                          )}
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari soal..."
                  className="flex-1 min-w-[180px] bg-white rounded-lg border-2 border-outline-variant/20 px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="bg-white rounded-lg border-2 border-outline-variant/20 px-3 py-2 text-sm text-on-surface focus:outline-none">
                  <option value="">Semua Tipe</option>
                  {Object.entries(QTYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)}
                  className="bg-white rounded-lg border-2 border-outline-variant/20 px-3 py-2 text-sm text-on-surface focus:outline-none">
                  <option value="">Semua Level</option>
                  {Object.entries(DIFFICULTY_LABEL).map(([v, d]) => <option key={v} value={v}>{d.label}</option>)}
                </select>
              </div>

              {/* Question list */}
              {loadingQs ? (
                <LoadingSpinner text="Memuat soal..." />
              ) : filteredQuestions.length === 0 ? (
                <div className="bg-white rounded-xl bubbly-shadow p-8 text-center">
                  <MaterialIcon name="quiz" className="text-4xl text-outline-variant mb-2" />
                  <p className="text-on-surface-variant text-sm">
                    {searchQuery || filterType || filterDiff ? "Tidak ada soal yang sesuai filter." : "Belum ada soal. Klik 'Tambah Soal' untuk mulai."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredQuestions.map((q, idx) => (
                    <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                      className="bg-white rounded-xl bubbly-shadow p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-primary font-black text-xs w-6 flex-shrink-0 mt-0.5">#{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-on-surface text-sm font-medium line-clamp-2 mb-2">{q.question_text}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-container/40 text-primary font-medium">
                              {QTYPE_LABEL[q.question_type as QType] ?? q.question_type}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_LABEL[q.difficulty as Difficulty]?.color ?? ""}`}>
                              {DIFFICULTY_LABEL[q.difficulty as Difficulty]?.label ?? q.difficulty}
                            </span>
                            {q.category && <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{q.category}</span>}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-bold">{q.default_points} poin</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => handleEditQ(q)} className={btnSec}>
                            <MaterialIcon name="edit" className="text-sm" />
                          </button>
                          <button onClick={() => handleDeleteQ(q.id)} className={btnDng}>
                            <MaterialIcon name="delete" className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getBatches,
  getQuestionsByBatch,
  uploadQuestions,
  deleteQuestionsByBatch,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/services/adminService";
import { parseQuestionsExcel } from "@/utils/excelParser";
import type { Batch, QuestionWithOptions } from "@/lib/database.types";

interface QuestionForm {
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
  category: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  option_f: string;
  option_g: string;
  option_h: string;
  // For MCQ/binary/true_false: which single option is correct
  correct_answer: "A" | "B" | "C" | "D";
  // For checkbox: individual correct flags
  correct_a: boolean;
  correct_b: boolean;
  correct_c: boolean;
  correct_d: boolean;
  correct_e: boolean;
  correct_f: boolean;
  correct_g: boolean;
  correct_h: boolean;
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "bg-tertiary-container text-on-tertiary-container" },
  medium: { label: "Medium", color: "bg-secondary-container text-on-secondary-container" },
  hard: { label: "Hard", color: "bg-error-container/40 text-error" },
};

export default function QuestionsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionWithOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<QuestionForm>({
    defaultValues: { question_type: "multiple_choice", difficulty: "medium", points: 10 },
  });

  const questionType = useWatch({ control, name: "question_type" });
  const isTrueFalse = questionType === "true_false";
  const isBinary = questionType === "binary";
  const isCheckbox = questionType === "checkbox";
  const isEssay = questionType === "essay";
  const isSingleChoice = questionType === "multiple_choice" || isTrueFalse || isBinary;

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
  const checkboxOptionsCount = selectedBatch?.checkbox_options_count ?? 3;
  const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

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

  const loadQuestions = useCallback(async (batchId: string) => {
    if (!batchId) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getQuestionsByBatch(batchId);
      setQuestions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      loadQuestions(selectedBatchId);
    }
  }, [selectedBatchId, loadQuestions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBatchId) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseQuestionsExcel(buffer);

      if (parsed.length === 0) {
        setUploadResult("No questions found in the file");
        return;
      }

      await deleteQuestionsByBatch(selectedBatchId);
      await uploadQuestions(selectedBatchId, parsed);
      setUploadResult(`Successfully uploaded ${parsed.length} questions!`);
      await loadQuestions(selectedBatchId);
    } catch (err) {
      setUploadResult(`Error: ${err instanceof Error ? err.message : "Upload failed"}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmitQuestion = async (data: QuestionForm) => {
    if (!selectedBatchId) return;
    setSaving(true);
    try {
      let options: { option_text: string; option_label: string; is_correct: boolean }[] = [];

      if (data.question_type === "true_false") {
        options = [
          { option_text: "Benar", option_label: "A", is_correct: data.correct_answer === "A" },
          { option_text: "Salah", option_label: "B", is_correct: data.correct_answer === "B" },
        ];
      } else if (data.question_type === "binary") {
        options = [
          { option_text: "Ya", option_label: "A", is_correct: data.correct_answer === "A" },
          { option_text: "Tidak", option_label: "B", is_correct: data.correct_answer === "B" },
        ];
      } else if (data.question_type === "checkbox") {
        options = OPTION_LABELS.slice(0, checkboxOptionsCount).map((label) => ({
          option_text: (data[`option_${label.toLowerCase()}` as keyof QuestionForm] as string) ?? "",
          option_label: label,
          is_correct: (data[`correct_${label.toLowerCase()}` as keyof QuestionForm] as boolean) ?? false,
        }));
      } else if (data.question_type === "essay") {
        options = [];
      } else {
        // multiple_choice
        options = [
          { option_text: data.option_a, option_label: "A", is_correct: data.correct_answer === "A" },
          { option_text: data.option_b, option_label: "B", is_correct: data.correct_answer === "B" },
          { option_text: data.option_c, option_label: "C", is_correct: data.correct_answer === "C" },
          { option_text: data.option_d, option_label: "D", is_correct: data.correct_answer === "D" },
        ];
      }

      const shared = {
        question_text: data.question_text,
        question_type: data.question_type,
        category: data.category?.trim() || null,
        difficulty: data.difficulty,
        points: data.points,
        options,
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, shared);
      } else {
        await createQuestion(selectedBatchId, { ...shared, order_index: questions.length });
      }

      reset({ question_type: "multiple_choice", difficulty: "medium", points: 10 });
      setShowForm(false);
      setEditingQuestion(null);
      await loadQuestions(selectedBatchId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleEditQuestion = (q: QuestionWithOptions) => {
    setEditingQuestion(q);
    setValue("question_text", q.question_text);
    setValue("question_type", q.question_type as QuestionForm["question_type"]);
    setValue("category", q.category ?? "");
    setValue("difficulty", q.difficulty as QuestionForm["difficulty"]);
    setValue("points", q.points);

    if (q.question_type === "checkbox") {
      q.options.forEach((opt) => {
        const key = opt.option_label.toLowerCase();
        setValue(`option_${key}` as keyof QuestionForm, opt.option_text as never);
        setValue(`correct_${key}` as keyof QuestionForm, opt.is_correct as never);
      });
    } else if (q.question_type !== "essay") {
      const optA = q.options.find((o) => o.option_label === "A");
      const optB = q.options.find((o) => o.option_label === "B");
      const optC = q.options.find((o) => o.option_label === "C");
      const optD = q.options.find((o) => o.option_label === "D");
      const correct = q.options.find((o) => o.is_correct);
      setValue("option_a", optA?.option_text ?? "");
      setValue("option_b", optB?.option_text ?? "");
      setValue("option_c", optC?.option_text ?? "");
      setValue("option_d", optD?.option_text ?? "");
      setValue("correct_answer", (correct?.option_label ?? "A") as "A" | "B" | "C" | "D");
    }

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await deleteQuestion(questionId);
      await loadQuestions(selectedBatchId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (!selectedBatchId) return;
    if (!confirm("Delete ALL questions for this batch? This cannot be undone.")) return;

    try {
      await deleteQuestionsByBatch(selectedBatchId);
      setQuestions([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  // Unique categories from loaded questions (for datalist suggestions)
  const allCategories = Array.from(
    new Set(questions.map((q) => q.category).filter(Boolean) as string[])
  ).sort();

  const filteredQuestions = questions.filter((q) => {
    const matchSearch = !searchQuery || q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = !filterCategory || q.category === filterCategory;
    const matchDiff = !filterDifficulty || q.difficulty === filterDifficulty;
    return matchSearch && matchCat && matchDiff;
  });

  if (loading && batches.length === 0) return <LoadingSpinner text="Loading..." />;

  const inputClasses = "w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors";
  const btnSecondary = "px-3 py-1.5 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1";
  const btnDanger = "px-3 py-1.5 bg-error-container/20 text-error text-xs font-bold rounded-lg hover:bg-error-container/30 transition-colors flex items-center gap-1";

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-black text-on-surface tracking-tight mb-2">Question Management</h1>
      <p className="text-on-surface-variant text-sm mb-8">Create and manage quiz questions</p>

      {/* Batch Selector */}
      <div className="bg-white rounded-xl bubbly-shadow p-5 mb-8">
        <label className="block text-on-surface-variant text-sm font-medium mb-2">Select Batch</label>
        <select
          value={selectedBatchId}
          onChange={(e) => {
            setSelectedBatchId(e.target.value);
            setShowForm(false);
            setEditingQuestion(null);
            setSearchQuery("");
          }}
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

      {selectedBatchId && (
        <>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => {
                reset({
                  question_text: "",
                  points: 10,
                  option_a: "",
                  option_b: "",
                  option_c: "",
                  option_d: "",
                  correct_answer: "A",
                });
                setEditingQuestion(null);
                setShowForm(!showForm);
              }}
              className="px-5 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
            >
              <MaterialIcon name={showForm && !editingQuestion ? "close" : "add_circle"} className="text-lg" />
              {showForm && !editingQuestion ? "Cancel" : "Add Question"}
            </button>
            {questions.length > 0 && (
              <button onClick={handleDeleteAllQuestions} className={btnDanger + " py-2.5 px-5"}>
                <MaterialIcon name="delete_sweep" className="text-lg" />
                Delete All
              </button>
            )}
          </div>

          {/* Manual Question Form */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="bg-white rounded-xl bubbly-shadow p-6 mb-8 border border-primary/10">
                <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                  <MaterialIcon name={editingQuestion ? "edit" : "add_circle"} className="text-primary" />
                  {editingQuestion ? "Edit Question" : "Add New Question"}
                </h3>
                <form onSubmit={handleSubmit(onSubmitQuestion)} className="space-y-4">
                  {/* Question text */}
                  <div>
                    <label className="block text-on-surface-variant text-sm font-medium mb-1">Question Text *</label>
                    <textarea
                      {...register("question_text", { required: "Question text is required" })}
                      className={inputClasses}
                      rows={3}
                      placeholder="Enter question text..."
                    />
                    {errors.question_text && (
                      <p className="text-error text-xs mt-1">{errors.question_text.message}</p>
                    )}
                  </div>

                  {/* Type / Difficulty / Category / Points row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-on-surface-variant text-xs font-medium mb-1">Type</label>
                      <select {...register("question_type")} className={inputClasses}>
                        <option value="multiple_choice">Pilihan Ganda</option>
                        <option value="true_false">Benar/Salah</option>
                        <option value="binary">Ya/Tidak</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="essay">Essay</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-on-surface-variant text-xs font-medium mb-1">Difficulty</label>
                      <select {...register("difficulty")} className={inputClasses}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-on-surface-variant text-xs font-medium mb-1">Category</label>
                      <input
                        {...register("category")}
                        className={inputClasses}
                        placeholder="e.g. Leadership"
                        list="category-suggestions"
                      />
                      <datalist id="category-suggestions">
                        {allCategories.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-on-surface-variant text-xs font-medium mb-1">Points</label>
                      <input
                        type="number"
                        {...register("points", {
                          required: "Required",
                          min: { value: 1, message: "Minimum 1" },
                          valueAsNumber: true,
                        })}
                        className={inputClasses}
                      />
                      {errors.points && (
                        <p className="text-error text-xs mt-1">{errors.points.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Options — conditional on question_type */}
                  {isEssay ? (
                    <p className="text-on-surface-variant text-sm italic bg-surface-container-low p-3 rounded-lg">
                      Soal essay tidak memiliki pilihan jawaban. Penilaian dilakukan secara manual oleh supervisor.
                    </p>
                  ) : (isTrueFalse || isBinary) ? (
                    <div>
                      <label className="block text-on-surface-variant text-sm font-medium mb-2">Jawaban Benar</label>
                      <div className="flex gap-3">
                        {(["A", "B"] as const).map((val) => (
                          <label key={val} className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-outline-variant/30 cursor-pointer">
                            <input
                              type="radio"
                              value={val}
                              {...register("correct_answer", { required: "Pilih jawaban benar" })}
                              className="accent-primary"
                            />
                            <span className="font-bold text-sm">
                              {isBinary
                                ? (val === "A" ? "✓ Ya" : "✗ Tidak")
                                : (val === "A" ? "✓ Benar (True)" : "✗ Salah (False)")
                              }
                            </span>
                          </label>
                        ))}
                      </div>
                      {errors.correct_answer && <p className="text-error text-xs mt-1">{errors.correct_answer.message}</p>}
                    </div>
                  ) : isCheckbox ? (
                    <div>
                      <label className="block text-on-surface-variant text-sm font-medium mb-2">
                        Pilihan & Jawaban Benar ({checkboxOptionsCount} opsi — centang semua yang benar)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {OPTION_LABELS.slice(0, checkboxOptionsCount).map((label) => (
                          <div key={label} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                            <input
                              type="checkbox"
                              {...register(`correct_${label.toLowerCase()}` as keyof QuestionForm)}
                              className="w-4 h-4 accent-primary flex-shrink-0"
                            />
                            <input
                              {...register(`option_${label.toLowerCase()}` as keyof QuestionForm, { required: "Required" })}
                              className="flex-1 bg-transparent border-b border-outline-variant/40 py-1 text-sm text-on-surface focus:outline-none focus:border-primary"
                              placeholder={`Opsi ${label}`}
                            />
                            <span className="text-xs font-bold text-on-surface-variant w-5 text-center">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(["A", "B", "C", "D"] as const).map((label) => (
                          <div key={label}>
                            <label className="block text-on-surface-variant text-sm font-medium mb-1">Opsi {label}</label>
                            <input
                              {...register((`option_${label.toLowerCase()}`) as keyof QuestionForm, { required: "Required" })}
                              className={inputClasses}
                              placeholder={`Opsi ${label}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-on-surface-variant text-sm font-medium mb-1">Jawaban Benar</label>
                          <select
                            {...register("correct_answer", { required: "Required" })}
                            className={inputClasses}
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {saving ? "Saving..." : editingQuestion ? "Update Question" : "Add Question"}
                    </button>
                    {editingQuestion && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestion(null);
                          setShowForm(false);
                          reset({ question_type: "multiple_choice", difficulty: "medium", points: 10 });
                        }}
                        className={btnSecondary + " py-2.5 px-5"}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* Upload Section */}
          <div className="bg-white rounded-xl bubbly-shadow p-5 mb-8">
            <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
              <MaterialIcon name="upload_file" className="text-primary" />
              Upload Questions from Excel
            </h3>
            <p className="text-on-surface-variant text-xs mb-3">
              Columns: <code className="text-primary font-bold">question_text</code>,{" "}
              <code className="text-primary font-bold">option_a</code>,{" "}
              <code className="text-primary font-bold">option_b</code>,{" "}
              <code className="text-primary font-bold">option_c</code>,{" "}
              <code className="text-primary font-bold">option_d</code>,{" "}
              <code className="text-primary font-bold">correct_answer</code> (A/B/C/D),{" "}
              <code className="text-primary font-bold">points</code>
            </p>
            <p className="text-error text-xs mb-3 flex items-center gap-1">
              <MaterialIcon name="warning" className="text-sm" />
              Uploading will replace all existing questions in this batch.
            </p>
            <div className="flex gap-3 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="text-sm text-on-surface file:mr-3 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-primary-container file:text-on-primary-container file:font-bold file:cursor-pointer hover:file:opacity-80"
                disabled={uploading}
              />
              {uploading && <LoadingSpinner text="Uploading..." />}
            </div>
            {uploadResult && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-3 text-sm font-medium ${
                  uploadResult.startsWith("Error") ? "text-error" : "text-tertiary"
                }`}
              >
                {uploadResult}
              </motion.p>
            )}
          </div>

          {/* Search and List */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <h3 className="text-on-surface-variant text-sm font-medium mr-1">
              {questions.length} question{questions.length !== 1 ? "s" : ""}
              {(filterCategory || filterDifficulty || searchQuery) && ` (${filteredQuestions.length} shown)`}
            </h3>
            {questions.length > 3 && (
              <div className="relative">
                <MaterialIcon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline-variant text-sm" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions..."
                  className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-8 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none w-44"
                />
              </div>
            )}
            {allCategories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="">All categories</option>
                {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading questions..." />
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-xl bubbly-shadow p-8 text-center">
              <MaterialIcon name="quiz" className="text-5xl text-outline-variant mb-3" />
              <p className="text-on-surface-variant">
                {searchQuery || filterCategory || filterDifficulty
                  ? "No questions match the current filters."
                  : "No questions yet. Add one above or upload an Excel file."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => {
                const diff = DIFFICULTY_LABELS[q.difficulty] ?? DIFFICULTY_LABELS.medium;
                return (
                  <div key={q.id} className="bg-white rounded-xl bubbly-shadow p-5">
                    <div className="flex gap-4">
                      <span className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-sm font-black shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {q.question_type === "true_false" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container uppercase">True/False</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${diff.color}`}>
                            {diff.label}
                          </span>
                          {q.category && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant uppercase">
                              {q.category}
                            </span>
                          )}
                        </div>

                        <p className="text-on-surface text-sm font-medium mb-3">{q.question_text}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`text-xs px-3 py-2 rounded-lg border ${
                                opt.is_correct
                                  ? "border-tertiary bg-tertiary-container/30 text-on-tertiary-container font-bold"
                                  : "border-outline-variant/20 text-on-surface-variant"
                              }`}
                            >
                              <span className="font-bold">{opt.option_label}.</span> {opt.option_text}
                              {opt.is_correct && <MaterialIcon name="check_circle" className="text-sm ml-1 text-tertiary inline" />}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-on-surface-variant text-xs flex items-center gap-1">
                            <MaterialIcon name="star" className="text-sm text-primary" fill /> {q.points} pts
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditQuestion(q)} className={btnSecondary}>
                              <MaterialIcon name="edit" className="text-sm" /> Edit
                            </button>
                            <button onClick={() => handleDeleteQuestion(q.id)} className={btnDanger}>
                              <MaterialIcon name="delete" className="text-sm" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

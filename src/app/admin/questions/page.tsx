"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
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
  points: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<QuestionForm>();

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
      const options = [
        { option_text: data.option_a, option_label: "A" as const, is_correct: data.correct_answer === "A" },
        { option_text: data.option_b, option_label: "B" as const, is_correct: data.correct_answer === "B" },
        { option_text: data.option_c, option_label: "C" as const, is_correct: data.correct_answer === "C" },
        { option_text: data.option_d, option_label: "D" as const, is_correct: data.correct_answer === "D" },
      ];

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, {
          question_text: data.question_text,
          points: data.points,
          options,
        });
      } else {
        await createQuestion(selectedBatchId, {
          question_text: data.question_text,
          points: data.points,
          order_index: questions.length,
          options,
        });
      }

      reset();
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
    const optA = q.options.find((o) => o.option_label === "A");
    const optB = q.options.find((o) => o.option_label === "B");
    const optC = q.options.find((o) => o.option_label === "C");
    const optD = q.options.find((o) => o.option_label === "D");
    const correct = q.options.find((o) => o.is_correct);

    setValue("question_text", q.question_text);
    setValue("points", q.points);
    setValue("option_a", optA?.option_text ?? "");
    setValue("option_b", optB?.option_text ?? "");
    setValue("option_c", optC?.option_text ?? "");
    setValue("option_d", optD?.option_text ?? "");
    setValue("correct_answer", (correct?.option_label ?? "A") as "A" | "B" | "C" | "D");
    setShowForm(true);
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

  const filteredQuestions = searchQuery
    ? questions.filter((q) =>
        q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : questions;

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
                  <div>
                    <label className="block text-on-surface-variant text-sm font-medium mb-1">Question Text</label>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(["A", "B", "C", "D"] as const).map((label) => (
                      <div key={label}>
                        <label className="block text-on-surface-variant text-sm font-medium mb-1">Option {label}</label>
                        <input
                          {...register(`option_${label.toLowerCase()}` as keyof QuestionForm, { required: "Required" })}
                          className={inputClasses}
                          placeholder={`Option ${label}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-on-surface-variant text-sm font-medium mb-1">Correct Answer</label>
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
                    <div>
                      <label className="block text-on-surface-variant text-sm font-medium mb-1">Points</label>
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
                          reset();
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <h3 className="text-on-surface-variant text-sm font-medium">
              {questions.length} question{questions.length !== 1 ? "s" : ""} in this batch
              {searchQuery && ` (${filteredQuestions.length} matching)`}
            </h3>
            {questions.length > 3 && (
              <div className="relative w-full md:w-72">
                <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg pl-10 pr-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            )}
          </div>

          {loading ? (
            <LoadingSpinner text="Loading questions..." />
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-xl bubbly-shadow p-8 text-center">
              <MaterialIcon name="quiz" className="text-5xl text-outline-variant mb-3" />
              <p className="text-on-surface-variant">
                {searchQuery ? "No questions match your search." : "No questions yet. Add one above or upload an Excel file."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-xl bubbly-shadow p-5">
                  <div className="flex gap-4">
                    <span className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-sm font-black shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

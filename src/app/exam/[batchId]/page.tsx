"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useExamStore } from "@/store/examStore";
import AuthProvider from "@/components/AuthProvider";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  fetchExamQuestions,
  startExamSession,
  submitAnswer,
  finishExam,
  assertBatchAccessible,
} from "@/services/examService";
import { supabase } from "@/lib/supabase";
import type { Batch, QuestionWithOptions } from "@/lib/database.types";

type FeedbackType = "correct" | "wrong" | "partial" | "submitted";

function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;
  const { participant } = useAuthStore();
  const store = useExamStore();

  const {
    questions,
    currentIndex,
    answers,
    checkboxSelections,
    essayTexts,
    submittedQuestions,
    examTimeRemaining,
    examTotalTime,
    isSubmitting,
  } = store;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Map<string, FeedbackType>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // ─── Draft persistence helpers ────────────────────────────
  const saveEssayDraft = useCallback((questionId: string, text: string) => {
    if (!participant) return;
    try {
      const draftKey = `rpg_quiz_draft:${participant.id}:${batchId}`;
      const raw = localStorage.getItem(draftKey);
      const draft = raw ? JSON.parse(raw) : { essayTexts: {}, checkboxSelections: {} };
      if (!draft.essayTexts) draft.essayTexts = {};
      draft.essayTexts[questionId] = text;
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (e) {
      console.error("Failed to save draft", e);
    }
  }, [participant, batchId]);

  const saveCheckboxDraft = useCallback((questionId: string, optionId: string) => {
    if (!participant) return;
    try {
      const draftKey = `rpg_quiz_draft:${participant.id}:${batchId}`;
      const raw = localStorage.getItem(draftKey);
      const draft = raw ? JSON.parse(raw) : { essayTexts: {}, checkboxSelections: {} };
      if (!draft.checkboxSelections) draft.checkboxSelections = {};
      
      const currentSet = new Set<string>(draft.checkboxSelections[questionId] ?? []);
      if (currentSet.has(optionId)) {
        currentSet.delete(optionId);
      } else {
        currentSet.add(optionId);
      }
      draft.checkboxSelections[questionId] = [...currentSet];
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (e) {
      console.error("Failed to save draft", e);
    }
  }, [participant, batchId]);

  const removeQuestionFromDraft = useCallback((questionId: string) => {
    if (!participant) return;
    try {
      const draftKey = `rpg_quiz_draft:${participant.id}:${batchId}`;
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.essayTexts) delete draft.essayTexts[questionId];
        if (draft.checkboxSelections) delete draft.checkboxSelections[questionId];
        localStorage.setItem(draftKey, JSON.stringify(draft));
      }
    } catch (e) {
      console.error("Failed to remove draft", e);
    }
  }, [participant, batchId]);

  const clearAllDrafts = useCallback(() => {
    if (!participant) return;
    try {
      const draftKey = `rpg_quiz_draft:${participant.id}:${batchId}`;
      localStorage.removeItem(draftKey);
    } catch (e) {
      console.error("Failed to clear drafts", e);
    }
  }, [participant, batchId]);

  const finishingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const storeRef = useRef(store);
  // Wall-clock timestamp when the exam should end (ms).
  // Immune to setInterval throttling in background tabs.
  const examEndTimeRef = useRef<number | null>(null);
  storeRef.current = store;

  // ─── Load exam ────────────────────────────────────────────
  useEffect(() => {
    if (!participant || !batchId) return;
    let cancelled = false;

    async function load() {
      try {
        const { data: batchData, error: batchErr } = await supabase
          .from("batches").select("*").eq("id", batchId).single();
        if (batchErr || !batchData) throw new Error("Exam not found.");
        const b = batchData as Batch;
        assertBatchAccessible(b);
        setBatch(b);

        const session = await startExamSession(participant!.id, batchId, b);
        if (cancelled) return;
        setSessionId(session.id);

        if (session.status === "completed" || session.status === "timed_out") {
          setShowResults(true);
          setLoading(false);
          return;
        }

        const qs = await fetchExamQuestions(batchId, session.question_order);
        if (cancelled) return;

        // ── Wall-clock timer: calculate true remaining time ──────────────
        // Use session.started_at so a page-refresh doesn't reset the timer.
        const elapsedSeconds = Math.floor(
          (Date.now() - new Date(session.started_at).getTime()) / 1000
        );
        const remainingSeconds = Math.max(
          0,
          b.time_limit_seconds - elapsedSeconds
        );

        // If already expired server-side, finish immediately
        if (remainingSeconds <= 0) {
          storeRef.current.setQuestions(qs, b.time_limit_seconds);
          setLoading(false);
          handleFinish("timed_out");
          return;
        }

        storeRef.current.setQuestions(qs, b.time_limit_seconds);
        storeRef.current.setExamTimeRemaining(remainingSeconds);
        // Anchor the end-time for wall-clock sync
        examEndTimeRef.current = Date.now() + remainingSeconds * 1000;

        // Restore already-answered questions (resume support)
        const { data: existingAnswers } = await supabase
          .from("answers")
          .select("question_id, selected_option_id, selected_option_ids, essay_text")
          .eq("participant_id", participant!.id)
          .eq("batch_id", batchId);

        if (existingAnswers && existingAnswers.length > 0) {
          const newFeedback = new Map<string, FeedbackType>();
          (existingAnswers as Array<{
            question_id: string;
            selected_option_id: string | null;
            selected_option_ids: string[] | null;
            essay_text: string | null;
          }>).forEach((a) => {
            if (a.selected_option_id) {
              storeRef.current.selectAnswer(a.question_id, a.selected_option_id);
            } else if (a.essay_text !== null) {
              storeRef.current.setEssayText(a.question_id, a.essay_text ?? "");
              storeRef.current.submitEssayQuestion(a.question_id);
              newFeedback.set(a.question_id, "submitted");
            } else if ((a.selected_option_ids ?? []).length > 0) {
              storeRef.current.submitCheckboxQuestion(a.question_id);
              newFeedback.set(a.question_id, "submitted");
            }
          });
          setFeedbackMap(newFeedback);
        }

        // Restore unsubmitted drafts from localStorage
        try {
          const draftKey = `rpg_quiz_draft:${participant!.id}:${batchId}`;
          const rawDraft = localStorage.getItem(draftKey);
          if (rawDraft) {
            const draft = JSON.parse(rawDraft);
            const essayDrafts: Record<string, string> = {};
            const checkboxDrafts: Record<string, string[]> = {};

            if (draft.essayTexts) {
              Object.entries(draft.essayTexts).forEach(([qId, text]) => {
                const isSubmitted = existingAnswers?.some((a) => a.question_id === qId);
                if (!isSubmitted && typeof text === "string" && text.trim()) {
                  essayDrafts[qId] = text;
                }
              });
            }

            if (draft.checkboxSelections) {
              Object.entries(draft.checkboxSelections).forEach(([qId, optionIds]) => {
                const isSubmitted = existingAnswers?.some((a) => a.question_id === qId);
                if (!isSubmitted && Array.isArray(optionIds) && optionIds.length > 0) {
                  checkboxDrafts[qId] = optionIds;
                }
              });
            }

            storeRef.current.restoreDrafts(essayDrafts, checkboxDrafts);
          }
        } catch (e) {
          console.error("Failed to restore drafts from localStorage", e);
        }

        setLoading(false);
      } catch (err: unknown) {
        if (!cancelled) {
          setError((err as Error).message ?? "Failed to load exam");
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant, batchId]);

  // ─── Finish exam ──────────────────────────────────────────
  // Declared before timer / visibility effects that depend on it.
  const handleFinish = useCallback(async (status: "completed" | "timed_out") => {
    if (finishingRef.current || !sessionId || !participant) return;
    finishingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    storeRef.current.setSubmitting(true);
    try {
      const s = storeRef.current;
      await finishExam({
        sessionId,
        participantId: participant.id,
        totalScore: s.score,
        totalXP: s.xpEarned,
        maxStreak: s.maxStreak,
        status,
      });
      clearAllDrafts();
      storeRef.current.setFinished(true);
      setShowConfirmFinish(false);
      setShowResults(true);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to submit exam");
      finishingRef.current = false;
    } finally {
      storeRef.current.setSubmitting(false);
    }
  }, [sessionId, participant]);

  // ─── Global countdown timer (wall-clock based) ───────────
  // Uses Date.now() instead of pure tick-counting so it is immune to
  // setInterval throttling when the browser tab is hidden / device sleeps.
  useEffect(() => {
    if (loading || showResults) return;
    timerRef.current = setInterval(() => {
      if (examEndTimeRef.current === null) return;
      const remaining = Math.max(
        0,
        Math.round((examEndTimeRef.current - Date.now()) / 1000)
      );
      storeRef.current.setExamTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        handleFinish("timed_out");
      }
    }, 500); // Poll every 500 ms for sub-second accuracy
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, showResults, handleFinish]);

  // ─── Sync timer when tab becomes visible again ───────────
  // Handles: tab switch, browser minimize, device sleep/wake.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !showResults &&
        !loading &&
        examEndTimeRef.current !== null
      ) {
        const remaining = Math.max(
          0,
          Math.round((examEndTimeRef.current - Date.now()) / 1000)
        );
        storeRef.current.setExamTimeRemaining(remaining);
        if (remaining <= 0 && !finishingRef.current) {
          handleFinish("timed_out");
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [showResults, loading, handleFinish]);

  // ─── Online / offline detection ──────────────────────────
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // Sync with current state on mount
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ─── Submit single-choice (MCQ / true_false / binary) ─────
  const handleSingleAnswer = useCallback(async (question: QuestionWithOptions, optionId: string) => {
    if (storeRef.current.submittedQuestions.has(question.id) || submittingQuestion) return;
    setSubmittingQuestion(question.id);
    storeRef.current.markQuestionStart(question.id);

    const option = question.options.find((o) => o.id === optionId);
    const isCorrect = option?.is_correct ?? false;
    const s = storeRef.current;
    const timeTaken = s.getTimeTaken(question.id);
    const timeRatio = s.examTotalTime > 0 ? s.examTimeRemaining / s.examTotalTime : 1;

    storeRef.current.selectAnswer(question.id, optionId);
    try {
      const result = await submitAnswer({
        type: "single",
        participantId: participant!.id,
        questionId: question.id,
        batchId,
        selectedOptionId: optionId,
        isCorrect,
        points: question.points,
        streakCount: s.streak,
        timeRemainingRatio: timeRatio,
        timeTakenSeconds: timeTaken,
      });
      storeRef.current.addScore(result.pointsEarned);
      storeRef.current.addXP(result.xpEarned);
      if (isCorrect) storeRef.current.incrementStreak();
      else storeRef.current.resetStreak();

      setFeedbackMap((prev) => new Map(prev).set(question.id, isCorrect ? "correct" : "wrong"));

      // Auto-advance after brief feedback delay
      setTimeout(() => {
        const currentStore = storeRef.current;
        const idx = currentStore.currentIndex;
        const qs = currentStore.questions;
        let nextIdx = -1;
        for (let i = idx + 1; i < qs.length; i++) {
          if (!currentStore.submittedQuestions.has(qs[i].id)) { nextIdx = i; break; }
        }
        if (nextIdx === -1 && idx < qs.length - 1) nextIdx = idx + 1;
        if (nextIdx !== -1) currentStore.goToQuestion(nextIdx);
      }, 700);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to save answer");
    } finally {
      setSubmittingQuestion(null);
    }
  }, [participant, batchId, submittingQuestion]);

  // ─── Submit checkbox ──────────────────────────────────────
  const handleCheckboxSubmit = useCallback(async (question: QuestionWithOptions) => {
    if (storeRef.current.submittedQuestions.has(question.id) || submittingQuestion) return;
    const selections = storeRef.current.checkboxSelections.get(question.id) ?? new Set<string>();
    if (selections.size === 0) return;
    setSubmittingQuestion(question.id);
    storeRef.current.markQuestionStart(question.id);
    const selectedIds = [...selections];
    try {
      const result = await submitAnswer({
        type: "checkbox",
        participantId: participant!.id,
        questionId: question.id,
        batchId,
        selectedOptionIds: selectedIds,
        question,
        streakCount: storeRef.current.streak,
        timeTakenSeconds: storeRef.current.getTimeTaken(question.id),
      });
      storeRef.current.submitCheckboxQuestion(question.id);
      storeRef.current.addScore(result.pointsEarned);
      storeRef.current.addXP(result.xpEarned);
      const f: FeedbackType =
        result.pointsEarned === question.points ? "correct" :
        result.pointsEarned > 0 ? "partial" : "wrong";
      setFeedbackMap((prev) => new Map(prev).set(question.id, f));
      removeQuestionFromDraft(question.id);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to save answer");
    } finally {
      setSubmittingQuestion(null);
    }
  }, [participant, batchId, submittingQuestion]);

  // ─── Submit essay ─────────────────────────────────────────
  const handleEssaySubmit = useCallback(async (question: QuestionWithOptions) => {
    if (storeRef.current.submittedQuestions.has(question.id) || submittingQuestion) return;
    const text = storeRef.current.essayTexts.get(question.id) ?? "";
    if (!text.trim()) return;
    setSubmittingQuestion(question.id);
    storeRef.current.markQuestionStart(question.id);
    try {
      await submitAnswer({
        type: "essay",
        participantId: participant!.id,
        questionId: question.id,
        batchId,
        essayText: text,
        timeTakenSeconds: storeRef.current.getTimeTaken(question.id),
      });
      storeRef.current.submitEssayQuestion(question.id);
      setFeedbackMap((prev) => new Map(prev).set(question.id, "submitted"));
      removeQuestionFromDraft(question.id);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to save answer");
    } finally {
      setSubmittingQuestion(null);
    }
  }, [participant, batchId, submittingQuestion]);

  // ─── Derived values ───────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  const answeredCount = submittedQuestions.size;
  const allAnswered = answeredCount === questions.length && questions.length > 0;
  const timePercent = examTotalTime > 0 ? (examTimeRemaining / examTotalTime) * 100 : 100;
  const isTimeLow = examTimeRemaining > 0 && examTimeRemaining <= 60;

  const formatTime = (s: number) => {
    const m = Math.floor(Math.max(0, s) / 60);
    const sec = Math.max(0, s) % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const getNavBtnClass = (idx: number, qId: string) => {
    if (idx === currentIndex) return "bg-blue-500 text-white";
    if (submittedQuestions.has(qId)) return "bg-green-500 text-white";
    return "bg-surface text-on-surface border border-outline/30 hover:border-primary/50";
  };

  // ─── Loading / error ──────────────────────────────────────
  if (loading) {
    return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>;
  }

  if (error && !showResults) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6">
        <MaterialIcon name="error" className="text-error text-5xl" />
        <p className="text-on-surface-variant text-center max-w-md">{error}</p>
        <button onClick={() => router.back()}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm">
          Kembali
        </button>
      </div>
    );
  }

  // ─── Results screen ───────────────────────────────────────
  if (showResults) {
    const passing = batch?.passing_score ?? 0;
    const passed = passing === 0 || store.score >= passing;
    const hasEssay = questions.some((q) => q.question_type === "essay");

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-surface rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-outline/20">
          <div className={`text-5xl mb-4 ${hasEssay ? "" : passed ? "text-green-400" : "text-error"}`}>
            {hasEssay ? "📝" : passed ? "🎉" : "😔"}
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">
            {hasEssay ? "Ujian Selesai!" : passed ? "Selamat!" : "Belum Lulus"}
          </h2>

          {batch?.show_results !== false && (
            <p className="text-4xl font-bold text-primary my-4">{store.score}</p>
          )}
          {passing > 0 && batch?.show_results !== false && !hasEssay && (
            <p className={`text-sm font-semibold ${passed ? "text-green-400" : "text-error"}`}>
              {passed ? "✓ Lulus" : `✗ Tidak Lulus (min. ${passing})`}
            </p>
          )}
          {hasEssay && (
            <p className="text-sm text-on-surface-variant mt-2">
              Soal essay akan dinilai oleh supervisor. Nilai akan diperbarui setelah penilaian selesai.
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-surface-variant rounded-lg p-3">
              <div className="text-on-surface-variant text-xs">XP Diperoleh</div>
              <div className="font-bold text-primary">+{store.xpEarned}</div>
            </div>
            <div className="bg-surface-variant rounded-lg p-3">
              <div className="text-on-surface-variant text-xs">Streak Terbaik</div>
              <div className="font-bold text-tertiary">{store.maxStreak} 🔥</div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {batch?.show_answers_analysis && (
              <button onClick={() => router.push(`/review/${batchId}`)}
                className="w-full px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold">
                Lihat Pembahasan
              </button>
            )}
            <button onClick={() => router.push("/")}
              className="w-full px-4 py-2 rounded-lg border border-outline text-on-surface text-sm">
              Kembali ke Beranda
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const isSubmitted = submittedQuestions.has(currentQuestion.id);
  const feedback = feedbackMap.get(currentQuestion.id);
  const isBusy = submittingQuestion === currentQuestion.id;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-error text-on-error text-xs text-center py-1.5 px-4 font-semibold shrink-0 flex items-center justify-center gap-2">
          <MaterialIcon name="wifi_off" className="text-sm" />
          Koneksi terputus — jawaban tidak dapat disimpan. Periksa internet Anda.
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-outline/20 shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-on-surface truncate text-sm">{batch?.name}</h1>
          <p className="text-xs text-on-surface-variant">{answeredCount}/{questions.length} terjawab</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-bold text-sm transition-colors
          ${isTimeLow ? "bg-error/20 text-error animate-pulse" : "bg-surface-variant text-on-surface-variant"}`}>
          <MaterialIcon name="timer" className="text-base" />
          {formatTime(examTimeRemaining)}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1 bg-surface-variant shrink-0">
        <div className={`h-full transition-all duration-1000 ${isTimeLow ? "bg-error" : "bg-primary"}`}
          style={{ width: `${timePercent}%` }} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question navigator */}
        <div className="w-14 md:w-44 bg-surface border-r border-outline/20 flex flex-col shrink-0">
          <p className="text-xs text-on-surface-variant text-center py-2 border-b border-outline/20 hidden md:block">
            Navigasi Soal
          </p>
          <div className="flex-1 overflow-y-auto p-2">
            {(() => {
              const TYPE_LABELS: Record<string, string> = {
                multiple_choice: "Pilihan Ganda",
                true_false: "Benar/Salah",
                binary: "Ya/Tidak",
                checkbox: "Checkbox",
                essay: "Essay",
              };
              const questionTypes = new Set(questions.map((q) => q.question_type));
              const hasMultipleTypes = questionTypes.size > 1;

              if (!hasMultipleTypes) {
                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {questions.map((q, idx) => (
                      <button
                        key={q.id}
                        onClick={() => { storeRef.current.markQuestionStart(q.id); storeRef.current.goToQuestion(idx); }}
                        className={`w-full aspect-square rounded-lg text-xs font-bold transition-all ${getNavBtnClass(idx, q.id)}`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                );
              }

              // Group consecutive questions by type (preserves exam section order)
              type Group = { type: string; startIdx: number; qs: typeof questions };
              const groups: Group[] = [];
              questions.forEach((q, idx) => {
                const last = groups[groups.length - 1];
                if (last && last.type === q.question_type) {
                  last.qs.push(q);
                } else {
                  groups.push({ type: q.question_type, startIdx: idx, qs: [q] });
                }
              });

              return (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <div key={`${group.type}-${group.startIdx}`}>
                      <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-wide mb-1 hidden md:block">
                        {TYPE_LABELS[group.type] ?? group.type}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                        {group.qs.map((q, i) => {
                          const globalIdx = group.startIdx + i;
                          return (
                            <button
                              key={q.id}
                              onClick={() => { storeRef.current.markQuestionStart(q.id); storeRef.current.goToQuestion(globalIdx); }}
                              className={`w-full aspect-square rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center leading-none gap-0.5 ${getNavBtnClass(globalIdx, q.id)}`}
                            >
                              <span>{globalIdx + 1}</span>
                              <span className="text-[8px] opacity-70 font-normal hidden md:block">
                                {TYPE_LABELS[q.question_type]?.slice(0, 2) ?? "??"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="p-2 border-t border-outline/20 hidden md:block space-y-1 text-xs text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500 shrink-0" /> Saat ini
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500 shrink-0" /> Terjawab
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-outline/30 shrink-0" /> Belum
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div key={currentQuestion.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                className="max-w-2xl mx-auto">

                {/* Question header */}
                <div className="flex items-start gap-3 mb-6">
                  <span className="bg-primary text-on-primary text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-0.5">
                    {currentIndex + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-on-surface font-medium leading-relaxed whitespace-pre-wrap">
                      {currentQuestion.question_text}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded">
                        {currentQuestion.points} poin
                      </span>
                      {currentQuestion.category && (
                        <span className="text-xs text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">
                          {currentQuestion.category}
                        </span>
                      )}
                      {(() => {
                        const TYPE_BADGE: Record<string, string> = {
                          multiple_choice: "Pilihan Ganda",
                          true_false: "Benar/Salah",
                          binary: "Ya/Tidak",
                          checkbox: "Pilih Semua Benar",
                          essay: "Essay",
                        };
                        const hasMultipleTypes = new Set(questions.map((q) => q.question_type)).size > 1;
                        if (!hasMultipleTypes && currentQuestion.question_type === "multiple_choice") return null;
                        return (
                          <span className="text-xs px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant">
                            {TYPE_BADGE[currentQuestion.question_type] ?? currentQuestion.question_type}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Feedback banner */}
                <AnimatePresence>
                  {feedback && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2
                        ${feedback === "correct" ? "bg-green-500/20 text-green-400" :
                          feedback === "partial" ? "bg-yellow-500/20 text-yellow-400" :
                          feedback === "submitted" ? "bg-blue-500/20 text-blue-400" :
                          "bg-error/20 text-error"}`}>
                      <MaterialIcon name={
                        feedback === "correct" ? "check_circle" :
                        feedback === "partial" ? "rule" :
                        feedback === "submitted" ? "hourglass_empty" : "cancel"} />
                      {feedback === "correct" ? "Jawaban benar!" :
                       feedback === "partial" ? "Benar sebagian — nilai parsial diberikan" :
                       feedback === "submitted" ? "Terkirim — menunggu penilaian supervisor" :
                       "Jawaban salah"}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* MCQ */}
                {currentQuestion.question_type === "multiple_choice" && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answers.get(currentQuestion.id) === opt.id;
                      const showCorrect = isSubmitted && opt.is_correct;
                      const showWrong = isSubmitted && isSelected && !opt.is_correct;
                      return (
                        <button key={opt.id} disabled={isSubmitted || isBusy}
                          onClick={() => handleSingleAnswer(currentQuestion, opt.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm
                            ${showCorrect ? "border-green-500 bg-green-500/10 text-green-400" :
                              showWrong ? "border-error bg-error/10 text-error" :
                              isSelected ? "border-primary bg-primary/10 text-primary" :
                              "border-outline/30 bg-surface text-on-surface"}
                            ${!isSubmitted && !isBusy ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer" : "cursor-default"}`}>
                          <span className="font-semibold mr-2">{opt.option_label}.</span>
                          {opt.option_text}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* True/False */}
                {currentQuestion.question_type === "true_false" && (
                  <div className="flex gap-4">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answers.get(currentQuestion.id) === opt.id;
                      const showCorrect = isSubmitted && opt.is_correct;
                      const showWrong = isSubmitted && isSelected && !opt.is_correct;
                      return (
                        <button key={opt.id} disabled={isSubmitted || isBusy}
                          onClick={() => handleSingleAnswer(currentQuestion, opt.id)}
                          className={`flex-1 py-5 rounded-xl border font-bold text-lg transition-all
                            ${showCorrect ? "border-green-500 bg-green-500/20 text-green-400" :
                              showWrong ? "border-error bg-error/20 text-error" :
                              isSelected ? "border-primary bg-primary/20 text-primary" :
                              "border-outline/30 bg-surface text-on-surface"}
                            ${!isSubmitted && !isBusy ? "hover:border-primary/50 cursor-pointer" : "cursor-default"}`}>
                          {opt.option_text}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Binary (Ya/Tidak) */}
                {currentQuestion.question_type === "binary" && (
                  <div className="flex gap-4">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answers.get(currentQuestion.id) === opt.id;
                      const showCorrect = isSubmitted && opt.is_correct;
                      const showWrong = isSubmitted && isSelected && !opt.is_correct;
                      return (
                        <button key={opt.id} disabled={isSubmitted || isBusy}
                          onClick={() => handleSingleAnswer(currentQuestion, opt.id)}
                          className={`flex-1 py-5 rounded-xl border font-bold text-lg transition-all
                            ${showCorrect ? "border-green-500 bg-green-500/20 text-green-400" :
                              showWrong ? "border-error bg-error/20 text-error" :
                              isSelected ? "border-primary bg-primary/20 text-primary" :
                              "border-outline/30 bg-surface text-on-surface"}
                            ${!isSubmitted && !isBusy ? "hover:border-primary/50 cursor-pointer" : "cursor-default"}`}>
                          {opt.option_text}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Checkbox */}
                {currentQuestion.question_type === "checkbox" && (
                  <div className="space-y-3">
                    <p className="text-xs text-on-surface-variant">
                      Pilih semua jawaban yang benar (boleh lebih dari satu)
                    </p>
                    {currentQuestion.options.map((opt) => {
                      const sel = checkboxSelections.get(currentQuestion.id) ?? new Set<string>();
                      const isChecked = sel.has(opt.id);
                      const showCorrect = isSubmitted && opt.is_correct;
                      const showWrong = isSubmitted && isChecked && !opt.is_correct;
                      return (
                        <button key={opt.id} disabled={isSubmitted || isBusy}
                          onClick={() => {
                            if (!isSubmitted) {
                              store.toggleCheckboxOption(currentQuestion.id, opt.id);
                              saveCheckboxDraft(currentQuestion.id, opt.id);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm flex items-center gap-3
                            ${showCorrect ? "border-green-500 bg-green-500/10" :
                              showWrong ? "border-error bg-error/10" :
                              isChecked ? "border-primary bg-primary/10" :
                              "border-outline/30 bg-surface"}
                            ${!isSubmitted ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer" : "cursor-default"}`}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                            ${showCorrect ? "border-green-500 bg-green-500" :
                              showWrong ? "border-error bg-error" :
                              isChecked ? "border-primary bg-primary" : "border-outline/40"}`}>
                            {(isChecked || showCorrect) && <MaterialIcon name="check" className="text-white text-xs" />}
                          </div>
                          <span className={showCorrect ? "text-green-400" : showWrong ? "text-error" : "text-on-surface"}>
                            <span className="font-semibold mr-1">{opt.option_label}.</span>
                            {opt.option_text}
                          </span>
                        </button>
                      );
                    })}
                    {!isSubmitted && (
                      <button disabled={isBusy || (checkboxSelections.get(currentQuestion.id)?.size ?? 0) === 0}
                        onClick={() => handleCheckboxSubmit(currentQuestion)}
                        className="mt-1 w-full py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm
                          disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition">
                        {isBusy ? "Menyimpan..." : "Submit Jawaban"}
                      </button>
                    )}
                  </div>
                )}

                {/* Essay */}
                {currentQuestion.question_type === "essay" && (
                  <div className="space-y-3">
                    <p className="text-xs text-on-surface-variant">
                      Jawaban akan dinilai secara manual oleh supervisor area Anda.
                    </p>
                    <textarea
                      disabled={isSubmitted}
                      value={essayTexts.get(currentQuestion.id) ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        store.setEssayText(currentQuestion.id, val);
                        saveEssayDraft(currentQuestion.id, val);
                      }}
                      rows={7}
                      placeholder="Tulis jawaban Anda di sini..."
                      className="w-full px-4 py-3 rounded-xl border border-outline/30 bg-surface text-on-surface
                        text-sm resize-y focus:outline-none focus:border-primary transition-colors
                        disabled:opacity-60 disabled:bg-surface-variant disabled:cursor-default"
                    />
                    {!isSubmitted && (
                      <button
                        disabled={isBusy || !(essayTexts.get(currentQuestion.id) ?? "").trim()}
                        onClick={() => handleEssaySubmit(currentQuestion)}
                        className="w-full py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm
                          disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition">
                        {isBusy ? "Menyimpan..." : "Submit Jawaban"}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom navigation */}
          <div className="px-4 py-3 bg-surface border-t border-outline/20 flex items-center justify-between gap-3 shrink-0">
            <button disabled={currentIndex === 0} onClick={() => store.goToPrevious()}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-outline/30 text-sm text-on-surface
                disabled:opacity-30 hover:bg-surface-variant transition">
              <MaterialIcon name="chevron_left" /> Sebelumnya
            </button>

            <button onClick={() => setShowConfirmFinish(true)} disabled={isSubmitting}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition
                ${allAnswered ? "bg-primary text-on-primary hover:opacity-90" :
                  "bg-surface-variant text-on-surface-variant border border-outline/30 hover:bg-error/10 hover:text-error hover:border-error/30"}`}>
              {isSubmitting ? "Menyimpan..." : "Selesai Ujian"}
            </button>

            <button disabled={currentIndex === questions.length - 1} onClick={() => store.goToNext()}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-outline/30 text-sm text-on-surface
                disabled:opacity-30 hover:bg-surface-variant transition">
              Berikutnya <MaterialIcon name="chevron_right" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirm finish dialog */}
      <AnimatePresence>
        {showConfirmFinish && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmFinish(false); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-xl border border-outline/20">
              <h3 className="font-bold text-on-surface text-lg mb-3">Selesaikan Ujian?</h3>
              {!allAnswered ? (
                <p className="text-sm text-on-surface-variant mb-4">
                  Masih ada{" "}
                  <span className="font-bold text-error">{questions.length - answeredCount}</span>{" "}
                  soal belum terjawab. Tetap selesaikan?
                </p>
              ) : (
                <p className="text-sm text-on-surface-variant mb-4">
                  Semua soal sudah terjawab. Konfirmasi untuk mengakhiri ujian.
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmFinish(false)}
                  className="flex-1 py-2 rounded-lg border border-outline/30 text-sm text-on-surface hover:bg-surface-variant">
                  Batal
                </button>
                <button onClick={() => handleFinish("completed")} disabled={isSubmitting}
                  className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold hover:opacity-90 disabled:opacity-50">
                  {isSubmitting ? "Menyimpan..." : "Ya, Selesai"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <ExamPage />
    </AuthProvider>
  );
}

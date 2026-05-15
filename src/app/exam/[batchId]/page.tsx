"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useExamStore } from "@/store/examStore";
import AuthProvider from "@/components/AuthProvider";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Timer from "@/components/ui/Timer";
import {
  fetchExamQuestions,
  startExamSession,
  submitAnswer,
  finishExam,
  getExamSession,
  assertBatchAccessible,
} from "@/services/examService";
import { getXPProgress, getLevelTitle } from "@/utils/gamification";
import { supabase } from "@/lib/supabase";

function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;
  const { participant } = useAuthStore();

  // Subscribe to reactive store values for rendering
  const store = useExamStore();
  const {
    questions,
    currentIndex,
    answers,
    score,
    xpEarned,
    streak,
    timeRemaining,
    totalTime,
    isFinished,
    isSubmitting,
  } = store;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<"correct" | "wrong" | null>(null);
  const [showResults, setShowResults] = useState(false);
  const submittedRef = useRef(new Set<string>());
  const finishingRef = useRef(false);

  // Load quiz
  useEffect(() => {
    if (!participant || !batchId) return;

    let cancelled = false;

    async function load() {
      try {
        // Check for a completed/timed-out session before fetching batch
        const existingSession = await getExamSession(participant!.id, batchId);
        if (existingSession && existingSession.status !== "in_progress") {
          if (!cancelled) setError("You have already completed this quest!");
          return;
        }

        const batchResult = await supabase
          .from("batches")
          .select("*")
          .eq("id", batchId)
          .single();

        const batchData = batchResult.data as
          | import("@/lib/database.types").Batch
          | null;

        if (!batchData) {
          if (!cancelled) setError("Quest not found");
          return;
        }

        // Enforce timing window (throws with user-friendly message)
        assertBatchAccessible(batchData);

        // Start or resume session — passes batch for randomisation logic
        const session = await startExamSession(participant!.id, batchId, batchData);

        // Fetch questions respecting per-participant question order
        const q = await fetchExamQuestions(batchId, session.question_order ?? null);

        if (!cancelled) {
          useExamStore.getState().setQuestions(q, batchData.time_limit_seconds);
          // Mark the first question's start time
          if (q.length > 0) {
            useExamStore.getState().markQuestionStart(q[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load quest");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      useExamStore.getState().reset();
      submittedRef.current.clear();
      finishingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant?.id, batchId]);

  // Mark question start time whenever the current question changes
  useEffect(() => {
    const q = useExamStore.getState().questions[currentIndex];
    if (q) useExamStore.getState().markQuestionStart(q.id);
  }, [currentIndex]);

  // Finish exam
  const doFinish = useCallback(
    async (status: "completed" | "timed_out") => {
      if (finishingRef.current || !participant) return;
      finishingRef.current = true;
      useExamStore.getState().setFinished(true);

      try {
        const s = useExamStore.getState();
        await finishExam({
          participantId: participant.id,
          batchId,
          totalScore: s.score,
          totalXP: s.xpEarned,
          maxStreak: s.maxStreak,
          status,
        });
      } catch {
        // Show results even if DB update fails
      }

      setShowResults(true);
    },
    [participant, batchId]
  );

  // Handle answer selection
  const handleSelectAnswer = useCallback(
    async (optionId: string) => {
      const s = useExamStore.getState();
      if (s.isFinished || s.isSubmitting || feedbackState) return;

      const question = s.questions[s.currentIndex];
      if (!question || !participant) return;

      if (submittedRef.current.has(question.id)) return;
      submittedRef.current.add(question.id);

      s.selectAnswer(question.id, optionId);
      s.setSubmitting(true);

      const selectedOption = question.options.find((o) => o.id === optionId);
      const isCorrect = selectedOption?.is_correct ?? false;

      try {
        const timeTaken = useExamStore.getState().getTimeTaken(question.id);
        const result = await submitAnswer({
          participantId: participant.id,
          questionId: question.id,
          batchId,
          selectedOptionId: optionId,
          isCorrect,
          points: question.points,
          streakCount: isCorrect ? s.streak : 0,
          timeRemainingRatio: s.totalTime > 0 ? s.timeRemaining / s.totalTime : 0,
          timeTakenSeconds: timeTaken,
        });

        s.addScore(result.pointsEarned);
        s.addXP(result.xpEarned);

        if (isCorrect) {
          s.incrementStreak();
          setFeedbackState("correct");
        } else {
          s.resetStreak();
          setFeedbackState("wrong");
        }

        setTimeout(() => {
          setFeedbackState(null);
          const latest = useExamStore.getState();
          if (latest.currentIndex < latest.questions.length - 1) {
            latest.goToNext();
          } else {
            doFinish("completed");
          }
        }, 1200);
      } catch {
        submittedRef.current.delete(question.id);
      } finally {
        useExamStore.getState().setSubmitting(false);
      }
    },
    [participant, batchId, feedbackState, doFinish]
  );

  // Handle time up for current question
  const handleTimeUp = useCallback(() => {
    const s = useExamStore.getState();
    if (s.isFinished || feedbackState) return;

    const question = s.questions[s.currentIndex];
    if (!question) return;

    if (!submittedRef.current.has(question.id)) {
      submittedRef.current.add(question.id);
      s.resetStreak();
      setFeedbackState("wrong");

      setTimeout(() => {
        setFeedbackState(null);
        const latest = useExamStore.getState();
        if (latest.currentIndex < latest.questions.length - 1) {
          latest.goToNext();
        } else {
          doFinish("timed_out");
        }
      }, 800);
    }
  }, [feedbackState, doFinish]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner text="Preparing your quest..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
        <div className="max-w-md w-full bg-white rounded-2xl bubbly-shadow p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-error-container/20 flex items-center justify-center mx-auto mb-4">
            <MaterialIcon name="error" className="text-3xl text-error" />
          </div>
          <p className="text-error font-medium mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    return <ExamResults score={score} xpEarned={xpEarned} maxStreak={store.maxStreak} batchId={batchId} />;
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const selectedOptionId = answers.get(currentQuestion.id);
  const xpProgress = participant ? getXPProgress(participant.xp + xpEarned) : { current: 0, needed: 100, percentage: 0 };
  const currentLevel = participant ? participant.level : 1;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto bg-surface">
      {/* Top Bar - Player Info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
            <MaterialIcon name="shield" className="text-xl text-on-primary-container" fill />
          </div>
          <div>
            <p className="text-on-surface font-bold text-sm">{participant?.name}</p>
            <p className="text-on-surface-variant text-xs">
              {getLevelTitle(currentLevel)} &middot; LV.{currentLevel}
            </p>
          </div>
        </div>

        {/* Streak */}
        {streak > 1 && (
          <motion.div
            className="flex items-center gap-1 px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <MaterialIcon name="local_fire_department" className="text-lg" fill />
            <span className="font-black text-sm">{streak}x STREAK</span>
          </motion.div>
        )}

        {/* Score */}
        <div className="text-right">
          <p className="text-primary font-black text-lg">{score} pts</p>
          <p className="text-on-surface-variant text-xs">+{xpEarned} XP</p>
        </div>
      </div>

      {/* XP Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-on-surface-variant mb-1">
          <span>LV.{currentLevel}</span>
          <span>{xpProgress.current}/{xpProgress.needed} XP</span>
        </div>
        <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress.percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Timer */}
      <Timer
        timeRemaining={timeRemaining}
        totalTime={totalTime}
        onTimeUp={handleTimeUp}
        onTick={store.setTimeRemaining}
        isPaused={!!feedbackState || isSubmitting}
      />

      {/* Question Progress */}
      <div className="flex gap-1.5 my-5 justify-center flex-wrap">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full transition-all ${
              idx === currentIndex
                ? "bg-primary text-on-primary scale-110 shadow-lg shadow-primary/30"
                : answers.has(q.id)
                ? "bg-tertiary-container text-on-tertiary-container"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {idx + 1}
          </div>
        ))}
      </div>

      {/* Battle Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {/* Question Card */}
          <div
            className={`bg-white rounded-2xl bubbly-shadow p-6 md:p-8 mb-6 relative overflow-hidden border-2 transition-colors ${
              feedbackState === "correct"
                ? "border-rpg-correct"
                : feedbackState === "wrong"
                ? "border-rpg-wrong"
                : "border-transparent"
            }`}
          >
            {/* Feedback Overlay */}
            {feedbackState && (
              <motion.div
                className={`absolute inset-0 flex items-center justify-center z-10 ${
                  feedbackState === "correct" ? "bg-rpg-correct/10" : "bg-rpg-wrong/10"
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center gap-2">
                  <MaterialIcon
                    name={feedbackState === "correct" ? "check_circle" : "cancel"}
                    className={`text-4xl ${feedbackState === "correct" ? "text-rpg-correct" : "text-rpg-wrong"}`}
                    fill
                  />
                  <span className="font-black text-xl">
                    {feedbackState === "correct" ? "CORRECT!" : "WRONG!"}
                  </span>
                </div>
              </motion.div>
            )}

            <div className="text-center mb-2">
              <span className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">
                Quest {currentIndex + 1} of {questions.length}
              </span>
            </div>
            <div className="flex justify-center py-3 mb-3">
              <div className="w-16 h-16 rounded-full bg-primary-container/50 flex items-center justify-center">
                <MaterialIcon name="help" className="text-3xl text-primary" fill />
              </div>
            </div>
            <p className="text-on-surface text-center text-base md:text-lg leading-relaxed font-medium">
              {currentQuestion.question_text}
            </p>
            <p className="text-center text-on-surface-variant text-xs mt-3 flex items-center justify-center gap-1">
              <MaterialIcon name="star" className="text-sm text-primary" fill /> {currentQuestion.points} points
            </p>
          </div>

          {/* Answer Choices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const showCorrect = feedbackState && option.is_correct;
              const showWrong = feedbackState === "wrong" && isSelected;

              return (
                <motion.button
                  key={option.id}
                  whileHover={!feedbackState && !isSubmitting ? { scale: 1.02 } : {}}
                  whileTap={!feedbackState && !isSubmitting ? { scale: 0.98 } : {}}
                  onClick={() => handleSelectAnswer(option.id)}
                  disabled={!!feedbackState || isSubmitting || !!selectedOptionId}
                  className={`
                    bg-white rounded-xl p-4 text-left transition-all bubbly-shadow border-2
                    ${
                      showCorrect
                        ? "border-rpg-correct bg-rpg-correct/5"
                        : showWrong
                        ? "border-rpg-wrong bg-rpg-wrong/5"
                        : isSelected
                        ? "border-primary bg-primary-container/20"
                        : "border-transparent hover:border-primary/30"
                    }
                    disabled:cursor-not-allowed
                  `.trim()}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                        showCorrect
                          ? "bg-rpg-correct/20 text-rpg-correct"
                          : showWrong
                          ? "bg-rpg-wrong/20 text-rpg-wrong"
                          : "bg-primary-container text-on-primary-container"
                      }`}
                    >
                      {option.option_label}
                    </span>
                    <span className="text-sm font-medium text-on-surface">{option.option_text}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ExamResults({
  score,
  xpEarned,
  maxStreak,
  batchId,
}: {
  score: number;
  xpEarned: number;
  maxStreak: number;
  batchId: string;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl bubbly-shadow p-8 text-center">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <div className="w-20 h-20 rounded-full bg-primary-container mx-auto flex items-center justify-center mb-4">
              <MaterialIcon name="emoji_events" className="text-4xl text-on-primary-container" fill />
            </div>
            <h2 className="text-2xl font-black text-on-surface mb-1">Quest Complete!</h2>
            <p className="text-on-surface-variant text-sm mb-6">Well done, hero!</p>
          </motion.div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10">
                <div className="text-primary font-black text-xl">{score}</div>
                <div className="text-on-surface-variant text-xs">Score</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10">
                <div className="text-tertiary font-black text-xl">+{xpEarned}</div>
                <div className="text-on-surface-variant text-xs">XP</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10">
                <div className="text-secondary font-black text-xl">{maxStreak}x</div>
                <div className="text-on-surface-variant text-xs">Streak</div>
              </div>
            </motion.div>
          </div>

          <div className="space-y-3">
            <button
              className="w-full px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              onClick={() => router.push(`/review/${batchId}`)}
            >
              <MaterialIcon name="auto_stories" /> Review Answers
            </button>
            <button
              className="w-full px-6 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
              onClick={() => router.push("/leaderboard")}
            >
              <MaterialIcon name="leaderboard" /> Leaderboard
            </button>
            <button
              className="w-full px-6 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
              onClick={() => router.push("/")}
            >
              <MaterialIcon name="home" /> Back to Home
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ExamPageWrapper() {
  return (
    <AuthProvider>
      <ExamPage />
    </AuthProvider>
  );
}

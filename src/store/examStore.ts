import { create } from "zustand";
import type { QuestionWithOptions } from "@/lib/database.types";

interface ExamState {
  // Questions & navigation
  questions: QuestionWithOptions[];
  currentIndex: number;

  // Single-choice answers (MCQ / true_false / binary): questionId → optionId
  answers: Map<string, string>;
  // Checkbox selections (before submission): questionId → Set<optionId>
  checkboxSelections: Map<string, Set<string>>;
  // Essay draft texts: questionId → text
  essayTexts: Map<string, string>;
  // Questions that have been definitively submitted
  submittedQuestions: Set<string>;

  // Scoring
  score: number;
  xpEarned: number;
  streak: number;
  maxStreak: number;

  // Global exam timer (does NOT reset on question navigation)
  examTimeRemaining: number; // seconds
  examTotalTime: number; // initial seconds (for progress bar)

  // Status
  isFinished: boolean;
  isSubmitting: boolean;

  // Per-question start times (epoch ms) for time_taken_seconds tracking
  questionStartTimes: Map<string, number>;

  // Actions — setup
  setQuestions: (questions: QuestionWithOptions[], totalTimeSeconds: number) => void;

  // Actions — single-choice (MCQ / true_false / binary)
  selectAnswer: (questionId: string, optionId: string) => void;

  // Actions — checkbox
  toggleCheckboxOption: (questionId: string, optionId: string) => void;
  submitCheckboxQuestion: (questionId: string) => void;

  // Actions — essay
  setEssayText: (questionId: string, text: string) => void;
  submitEssayQuestion: (questionId: string) => void;

  // Actions — navigation
  goToNext: () => void;
  goToPrevious: () => void;
  goToQuestion: (index: number) => void;

  // Actions — scoring
  addScore: (points: number) => void;
  addXP: (xp: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;

  // Actions — timer
  setExamTimeRemaining: (time: number) => void;

  // Actions — state
  setFinished: (finished: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  markQuestionStart: (questionId: string) => void;
  /** Returns seconds elapsed since question was first opened (capped at examTotalTime). */
  getTimeTaken: (questionId: string) => number;
  /** Returns true if the question has been submitted/answered. */
  isQuestionAnswered: (questionId: string) => boolean;
  /** Count of submitted questions. */
  getAnsweredCount: () => number;
  restoreDrafts: (essayDrafts: Record<string, string>, checkboxDrafts: Record<string, string[]>) => void;
  reset: () => void;
}

const freshMaps = () => ({
  answers: new Map<string, string>(),
  checkboxSelections: new Map<string, Set<string>>(),
  essayTexts: new Map<string, string>(),
  submittedQuestions: new Set<string>(),
  questionStartTimes: new Map<string, number>(),
});

export const useExamStore = create<ExamState>((set, get) => ({
  questions: [],
  currentIndex: 0,
  ...freshMaps(),
  score: 0,
  xpEarned: 0,
  streak: 0,
  maxStreak: 0,
  examTimeRemaining: 0,
  examTotalTime: 0,
  isFinished: false,
  isSubmitting: false,

  setQuestions: (questions, totalTimeSeconds) =>
    set({
      questions,
      currentIndex: 0,
      ...freshMaps(),
      score: 0,
      xpEarned: 0,
      streak: 0,
      maxStreak: 0,
      examTimeRemaining: totalTimeSeconds,
      examTotalTime: totalTimeSeconds,
      isFinished: false,
      isSubmitting: false,
    }),

  // Single-choice: record answer and mark as submitted immediately
  selectAnswer: (questionId, optionId) =>
    set((state) => {
      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, optionId);
      const newSubmitted = new Set(state.submittedQuestions);
      newSubmitted.add(questionId);
      return { answers: newAnswers, submittedQuestions: newSubmitted };
    }),

  toggleCheckboxOption: (questionId, optionId) =>
    set((state) => {
      const newSelections = new Map(state.checkboxSelections);
      const current = new Set(newSelections.get(questionId) ?? []);
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        current.add(optionId);
      }
      newSelections.set(questionId, current);
      return { checkboxSelections: newSelections };
    }),

  submitCheckboxQuestion: (questionId) =>
    set((state) => {
      const newSubmitted = new Set(state.submittedQuestions);
      newSubmitted.add(questionId);
      return { submittedQuestions: newSubmitted };
    }),

  setEssayText: (questionId, text) =>
    set((state) => {
      const newTexts = new Map(state.essayTexts);
      newTexts.set(questionId, text);
      return { essayTexts: newTexts };
    }),

  submitEssayQuestion: (questionId) =>
    set((state) => {
      const newSubmitted = new Set(state.submittedQuestions);
      newSubmitted.add(questionId);
      return { submittedQuestions: newSubmitted };
    }),

  goToNext: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    })),

  goToPrevious: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),

  goToQuestion: (index) =>
    set((state) => ({
      currentIndex: Math.max(0, Math.min(index, state.questions.length - 1)),
    })),

  addScore: (points) =>
    set((state) => ({ score: state.score + points })),

  addXP: (xp) =>
    set((state) => ({ xpEarned: state.xpEarned + xp })),

  incrementStreak: () =>
    set((state) => {
      const newStreak = state.streak + 1;
      return { streak: newStreak, maxStreak: Math.max(state.maxStreak, newStreak) };
    }),

  resetStreak: () => set({ streak: 0 }),

  setExamTimeRemaining: (time) => set({ examTimeRemaining: time }),

  setFinished: (finished) => set({ isFinished: finished }),

  setSubmitting: (submitting) => set({ isSubmitting: submitting }),

  markQuestionStart: (questionId) =>
    set((state) => {
      if (state.questionStartTimes.has(questionId)) return {};
      const next = new Map(state.questionStartTimes);
      next.set(questionId, Date.now());
      return { questionStartTimes: next };
    }),

  getTimeTaken: (questionId) => {
    const state = get();
    const startMs = state.questionStartTimes.get(questionId);
    if (!startMs) return state.examTotalTime;
    const elapsed = Math.round((Date.now() - startMs) / 1000);
    return Math.min(elapsed, state.examTotalTime);
  },

  isQuestionAnswered: (questionId) => {
    return get().submittedQuestions.has(questionId);
  },

  getAnsweredCount: () => get().submittedQuestions.size,

  restoreDrafts: (essayDrafts, checkboxDrafts) =>
    set((state) => {
      const newEssayTexts = new Map(state.essayTexts);
      Object.entries(essayDrafts).forEach(([qId, text]) => {
        newEssayTexts.set(qId, text);
      });

      const newCheckboxSelections = new Map(state.checkboxSelections);
      Object.entries(checkboxDrafts).forEach(([qId, optionIds]) => {
        newCheckboxSelections.set(qId, new Set(optionIds));
      });

      return { essayTexts: newEssayTexts, checkboxSelections: newCheckboxSelections };
    }),

  reset: () =>
    set({
      questions: [],
      currentIndex: 0,
      ...freshMaps(),
      score: 0,
      xpEarned: 0,
      streak: 0,
      maxStreak: 0,
      examTimeRemaining: 0,
      examTotalTime: 0,
      isFinished: false,
      isSubmitting: false,
    }),
}));


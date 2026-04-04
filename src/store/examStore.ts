import { create } from "zustand";
import type { QuestionWithOptions } from "@/lib/database.types";

interface ExamState {
  questions: QuestionWithOptions[];
  currentIndex: number;
  answers: Map<string, string>; // questionId -> selectedOptionId
  score: number;
  xpEarned: number;
  streak: number;
  maxStreak: number;
  timeRemaining: number;
  totalTime: number;
  isFinished: boolean;
  isSubmitting: boolean;

  // Actions
  setQuestions: (questions: QuestionWithOptions[], timePerQuestion: number) => void;
  selectAnswer: (questionId: string, optionId: string) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToQuestion: (index: number) => void;
  addScore: (points: number) => void;
  addXP: (xp: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  setTimeRemaining: (time: number) => void;
  setFinished: (finished: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  reset: () => void;
}

const initialState = {
  questions: [],
  currentIndex: 0,
  answers: new Map<string, string>(),
  score: 0,
  xpEarned: 0,
  streak: 0,
  maxStreak: 0,
  timeRemaining: 0,
  totalTime: 0,
  isFinished: false,
  isSubmitting: false,
};

export const useExamStore = create<ExamState>((set) => ({
  ...initialState,

  setQuestions: (questions, timePerQuestion) =>
    set({
      questions,
      currentIndex: 0,
      totalTime: timePerQuestion,
      timeRemaining: timePerQuestion,
      answers: new Map(),
      score: 0,
      xpEarned: 0,
      streak: 0,
      maxStreak: 0,
      isFinished: false,
    }),

  selectAnswer: (questionId, optionId) =>
    set((state) => {
      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, optionId);
      return { answers: newAnswers };
    }),

  goToNext: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
      timeRemaining: state.totalTime,
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
      return {
        streak: newStreak,
        maxStreak: Math.max(state.maxStreak, newStreak),
      };
    }),

  resetStreak: () => set({ streak: 0 }),

  setTimeRemaining: (time) => set({ timeRemaining: time }),

  setFinished: (finished) => set({ isFinished: finished }),

  setSubmitting: (submitting) => set({ isSubmitting: submitting }),

  reset: () => set({ ...initialState, answers: new Map() }),
}));

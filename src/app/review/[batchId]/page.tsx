"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import AuthProvider from "@/components/AuthProvider";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getReviewAnswers } from "@/services/leaderboardService";
import { supabase } from "@/lib/supabase";

interface ReviewAnswer {
  id: string;
  is_correct: boolean;
  points_earned: number;
  xp_earned: number;
  selected_option_id: string | null;
  questions: {
    id: string;
    question_text: string;
    points: number;
    order_index: number;
    options: {
      id: string;
      option_text: string;
      is_correct: boolean;
      option_label: string;
    }[];
  };
}

function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;
  const { participant } = useAuthStore();

  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  const [batchName, setBatchName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!participant || !batchId) return;

    async function load() {
      try {
        const [answersData, batchResult] = await Promise.all([
          getReviewAnswers(participant!.id, batchId),
          supabase.from("batches").select("name").eq("id", batchId).single(),
        ]);

        setAnswers(answersData as unknown as ReviewAnswer[]);
        const bName = (batchResult.data as { name: string } | null)?.name ?? "Unknown Quest";
        setBatchName(bName);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [participant, batchId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner text="Loading review..." />
      </div>
    );
  }

  const correctCount = answers.filter((a) => a.is_correct).length;
  const totalScore = answers.reduce((sum, a) => sum + a.points_earned, 0);
  const totalXP = answers.reduce((sum, a) => sum + a.xp_earned, 0);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto bg-surface">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Quest Review</h1>
          <p className="text-on-surface-variant text-sm mt-1">{batchName}</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors flex items-center gap-1 text-sm"
        >
          <MaterialIcon name="arrow_back" className="text-lg" />
          Back
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl bubbly-shadow p-6 mb-8">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-tertiary font-black text-2xl">
              {correctCount}/{answers.length}
            </div>
            <div className="text-on-surface-variant text-xs">Correct</div>
          </div>
          <div>
            <div className="text-primary font-black text-2xl">{totalScore}</div>
            <div className="text-on-surface-variant text-xs">Score</div>
          </div>
          <div>
            <div className="text-secondary font-black text-2xl">+{totalXP}</div>
            <div className="text-on-surface-variant text-xs">XP</div>
          </div>
        </div>
      </div>

      {/* Answer History */}
      {answers.length === 0 ? (
        <div className="bg-white rounded-xl bubbly-shadow p-8 text-center">
          <MaterialIcon name="quiz" className="text-5xl text-outline-variant mb-3" />
          <p className="text-on-surface-variant">No answers to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {answers.map((answer, idx) => {
            const question = answer.questions;

            return (
              <motion.div
                key={answer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
              >
                <div
                  className={`bg-white rounded-xl bubbly-shadow p-5 border-l-4 ${
                    answer.is_correct ? "border-l-rpg-correct" : "border-l-rpg-wrong"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Result Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      answer.is_correct ? "bg-rpg-correct/10" : "bg-rpg-wrong/10"
                    }`}>
                      <MaterialIcon
                        name={answer.is_correct ? "check_circle" : "cancel"}
                        className={`text-xl ${answer.is_correct ? "text-rpg-correct" : "text-rpg-wrong"}`}
                        fill
                      />
                    </div>

                    <div className="flex-1">
                      {/* Question */}
                      <p className="text-sm font-bold text-on-surface mb-3">
                        <span className="text-primary text-xs font-black mr-2">#{idx + 1}</span>
                        {question.question_text}
                      </p>

                      {/* Options */}
                      <div className="space-y-1.5">
                        {question.options.map((opt) => {
                          const isUserAnswer = opt.id === answer.selected_option_id;
                          const isCorrectAnswer = opt.is_correct;

                          return (
                            <div
                              key={opt.id}
                              className={`text-xs px-3 py-2 rounded-lg border ${
                                isCorrectAnswer
                                  ? "border-rpg-correct bg-rpg-correct/5 text-rpg-correct font-bold"
                                  : isUserAnswer && !isCorrectAnswer
                                  ? "border-rpg-wrong bg-rpg-wrong/5 text-rpg-wrong"
                                  : "border-outline-variant/20 text-on-surface-variant"
                              }`}
                            >
                              <span className="font-bold">{opt.option_label}.</span>{" "}
                              {opt.option_text}
                              {isCorrectAnswer && (
                                <MaterialIcon name="check_circle" className="text-sm ml-1 inline" fill />
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <span className="ml-1 italic"> (your answer)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Points */}
                      <div className="flex gap-4 mt-3 text-xs">
                        <span className="text-primary font-bold flex items-center gap-0.5">
                          <MaterialIcon name="star" className="text-sm" fill /> +{answer.points_earned} pts
                        </span>
                        <span className="text-tertiary font-bold">+{answer.xp_earned} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReviewPageWrapper() {
  return (
    <AuthProvider>
      <ReviewPage />
    </AuthProvider>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getXPProgress, getLevelTitle } from "@/utils/gamification";
import { supabase } from "@/lib/supabase";
import type { Batch } from "@/lib/database.types";
import type { LeaderboardEntry } from "@/services/leaderboardService";

function HomePage() {
  const router = useRouter();
  const { participant, user } = useAuthStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      try {
        const [batchRes, leaderboardRes, assignedRes] = await Promise.all([
          supabase
            .from("batches")
            .select("*")
            .eq("is_active", true)
            .or(`start_time.is.null,start_time.lte.${new Date().toISOString()}`)
            .or(`end_time.is.null,end_time.gte.${new Date().toISOString()}`)
            .order("created_at", { ascending: false }),
          supabase
            .from("participants")
            .select("id, name, level, xp, total_score, quizzes_taken, avatar_url")
            .eq("role", "participant")
            .order("total_score", { ascending: false })
            .limit(5),
          participant!.role === "admin"
            ? Promise.resolve({ data: null })
            : supabase.from("batch_participants").select("batch_id").eq("participant_id", participant!.id),
        ]);

        let allBatches = batchRes.data ?? [];
        if (participant!.role !== "admin" && assignedRes.data) {
          const assignedIds = new Set((assignedRes.data as { batch_id: string }[]).map((r) => r.batch_id));
          allBatches = allBatches.filter((b) => assignedIds.has(b.id));
        }

        setBatches(allBatches);
        setTopPlayers(leaderboardRes.data ?? []);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (!user || !participant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading your quest..." />
      </div>
    );
  }

  const xpProgress = getXPProgress(participant.xp);
  const levelTitle = getLevelTitle(participant.level);

  // Calculate rank
  const myRank = topPlayers.findIndex((p) => p.id === participant.id) + 1;

  return (
    <div className="max-w-7xl mx-auto relative z-10">
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row gap-8 mb-12">
        {/* Welcome Card */}
        <div className="flex-1 bg-white/80 backdrop-blur-md p-10 rounded-[3rem] bubbly-shadow border border-white/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <MaterialIcon name="castle" className="text-9xl" fill />
          </div>
          <div className="relative z-10">
            <span className="inline-block px-4 py-1 bg-primary-container/20 text-primary font-bold rounded-full text-xs uppercase tracking-widest mb-4">
              Daily Briefing
            </span>
            <h1 className="text-5xl font-black text-on-surface tracking-tight mb-4">
              Welcome Home, {participant.name}!
            </h1>
            <p className="text-xl text-on-surface-variant mb-8 max-w-xl leading-relaxed">
              Your adventure in Maple Academy continues. The guild master has posted{" "}
              {batches.length} active quest{batches.length !== 1 ? "s" : ""} on the bulletin board. Are you ready to level up?
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push("/quests")}
                className="px-10 py-4 bubbly-gradient text-white font-black rounded-full shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <MaterialIcon name="swords" />
                Start Questing
              </button>
              <button
                onClick={() => router.push("/inventory")}
                className="px-10 py-4 bg-white text-primary font-black rounded-full shadow-lg border border-rose-100 hover:bg-rose-50 transition-all flex items-center gap-2"
              >
                <MaterialIcon name="backpack" />
                Check Gear
              </button>
            </div>
          </div>
        </div>

        {/* Side Stats */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Rank Card */}
          <div className="bg-gradient-to-br from-secondary to-secondary-dim p-8 rounded-[2.5rem] text-white shadow-xl shadow-secondary/20 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:rotate-12 transition-transform duration-500">
              <MaterialIcon name="military_tech" className="text-9xl" fill />
            </div>
            <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Current Rank</p>
            <h3 className="text-3xl font-black mb-4">
              {myRank > 0 ? `#${myRank}` : "Unranked"}
            </h3>
            <div className="flex items-center gap-2 text-sm font-bold bg-white/20 w-fit px-3 py-1 rounded-full">
              <MaterialIcon name="trending_up" className="text-sm" />
              Level {participant.level} {levelTitle}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-rose-100">
            <h4 className="font-black text-on-surface mb-4 flex items-center gap-2">
              <MaterialIcon name="bolt" className="text-primary" fill />
              Quick Stats
            </h4>
            <div className="space-y-4">
              {[
                { label: "Total Score", val: participant.total_score, max: Math.max(participant.total_score, 1000), color: "rose" },
                { label: "Experience", val: participant.xp, max: Math.max(participant.xp, 500), color: "blue" },
                { label: "Quests Done", val: participant.quizzes_taken, max: Math.max(participant.quizzes_taken, 10), color: "green" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="flex justify-between text-xs font-bold uppercase text-on-surface-variant mb-1">
                    <span>{stat.label}</span>
                    <span>{stat.val}</span>
                  </div>
                  <div className="h-2 w-full bg-rose-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${stat.color}-400 rounded-full transition-all duration-700`}
                      style={{ width: `${Math.min((stat.val / stat.max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* XP Progress */}
            <div className="mt-6 pt-4 border-t border-rose-100">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-primary">Level {participant.level}</span>
                <span className="text-on-surface-variant">{xpProgress.current}/{xpProgress.needed} XP</span>
              </div>
              <div className="h-3 w-full bg-rose-50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-700"
                  style={{ width: `${xpProgress.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { title: "Active Quests", desc: `${batches.length} available`, icon: "swords", color: "primary", onClick: () => router.push("/quests") },
          { title: "Leaderboard", desc: `${topPlayers.length} heroes`, icon: "leaderboard", color: "secondary", onClick: () => router.push("/leaderboard") },
          { title: "Inventory", desc: "Check your badges", icon: "backpack", color: "tertiary", onClick: () => router.push("/inventory") },
          { title: "Next Level", desc: `${xpProgress.needed - xpProgress.current} XP remaining`, icon: "keyboard_double_arrow_up", color: "primary", onClick: () => {} },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            onClick={card.onClick}
            className="bg-white/60 p-6 rounded-3xl border border-white/40 bubbly-shadow hover:-translate-y-1 transition-all cursor-pointer group"
          >
            <div className={`w-12 h-12 rounded-2xl bg-${card.color}-container/30 flex items-center justify-center text-${card.color} mb-4 group-hover:scale-110 transition-transform`}>
              <MaterialIcon name={card.icon} fill />
            </div>
            <h4 className="font-black text-on-surface text-sm">{card.title}</h4>
            <p className="text-xs text-on-surface-variant font-medium">{card.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Active Quests Preview */}
      {batches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-on-surface flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                <MaterialIcon name="swords" />
              </span>
              Available Quests
            </h2>
            <button
              onClick={() => router.push("/quests")}
              className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
            >
              View All <MaterialIcon name="arrow_forward_ios" className="text-xs" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.slice(0, 3).map((batch) => (
              <div
                key={batch.id}
                className="group relative bg-surface-container-lowest p-8 rounded-xl bubbly-shadow transition-all duration-300 border border-transparent hover:border-primary-container/30 hover:-translate-y-2 cursor-pointer"
                onClick={() => router.push(`/exam/${batch.id}`)}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-surface-container-high rounded-lg flex items-center justify-center shadow-inner">
                    <MaterialIcon name="foundation" className="text-4xl text-primary" fill />
                  </div>
                  <span className="px-3 py-1 bg-tertiary-container text-on-tertiary-container text-xs font-black rounded-full uppercase">
                    Active
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-on-surface mb-2 group-hover:text-primary transition-colors">
                  {batch.name}
                </h3>
                <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">
                  {batch.description ?? "Begin this quest to earn XP and level up!"}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-surface-container">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="timer" className="text-on-surface-variant text-sm" />
                    <span className="text-on-surface-variant text-xs font-bold">{batch.time_limit_seconds}s per question</span>
                  </div>
                  <button className="text-primary font-extrabold flex items-center gap-1 hover:gap-2 transition-all">
                    Start <MaterialIcon name="arrow_forward_ios" className="text-sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Mini Leaderboard */}
      {topPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-on-surface flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                <MaterialIcon name="leaderboard" />
              </span>
              Top Heroes
            </h2>
            <button
              onClick={() => router.push("/leaderboard")}
              className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
            >
              View All <MaterialIcon name="arrow_forward_ios" className="text-xs" />
            </button>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-[2rem] bubbly-shadow overflow-hidden border border-white/40">
            <div className="divide-y divide-rose-100/50">
              {topPlayers.map((player, index) => {
                const isMe = player.id === participant.id;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 px-8 py-5 hover:bg-rose-50/30 transition-colors ${isMe ? "bg-primary-container/10" : ""}`}
                  >
                    <span className="font-black text-on-surface-variant w-8 text-center">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
                      <MaterialIcon name="person" className="text-primary" fill />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${isMe ? "text-primary" : "text-on-surface"}`}>
                        {player.name} {isMe && "(You)"}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {getLevelTitle(player.level)} • Lv. {player.level}
                      </p>
                    </div>
                    <span className="font-black text-on-surface text-sm">
                      {player.total_score.toLocaleString()} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function HomePageWrapper() {
  return <HomePage />;
}

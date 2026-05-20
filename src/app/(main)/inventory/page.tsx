"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuthStore } from "@/store/authStore";
import { getLevelTitle } from "@/utils/gamification";
import { supabase } from "@/lib/supabase";
import type { ExamSession } from "@/lib/database.types";

type SessionWithBatch = ExamSession & { batches: { name: string } | null };

function InventoryPage() {
  const { participant } = useAuthStore();
  const [sessions, setSessions] = useState<SessionWithBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (!participant) return;

    supabase
      .from("exam_sessions")
      .select("*, batches(name)")
      .eq("participant_id", participant.id)
      .order("started_at", { ascending: false })
      .then(({ data }) => {
        setSessions((data ?? []) as unknown as SessionWithBatch[]);
        setLoading(false);
      }, () => {
        setLoading(false);
      });
  }, [participant]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading inventory..." />
      </div>
    );
  }

  // Build badge inventory from completed sessions
  const badges = sessions
    .filter((s) => s.status === "completed" || s.status === "timed_out")
    .map((s) => ({
      id: s.id,
      name: s.batches?.name ?? "Unknown Quest",
      type: s.status === "completed" ? "Badge" : "Attempt",
      rarity: s.score > 500 ? "Epic" : s.score > 200 ? "Rare" : s.score > 50 ? "Uncommon" : "Common",
      icon: s.status === "completed" ? "verified" : "timer",
      color: s.status === "completed" ? "green" : "orange",
      score: s.score,
      xp: s.total_xp,
      streak: s.max_streak,
    }));

  // Stats-based items from participant profile
  const achievements = [];
  if (participant) {
    if (participant.quizzes_taken >= 1) achievements.push({ name: "First Steps", type: "Achievement", rarity: "Common", icon: "steps", color: "stone", desc: "Completed your first quest" });
    if (participant.quizzes_taken >= 5) achievements.push({ name: "Quest Hunter", type: "Achievement", rarity: "Uncommon", icon: "explore", color: "blue", desc: "Completed 5 quests" });
    if (participant.quizzes_taken >= 10) achievements.push({ name: "Veteran Hero", type: "Achievement", rarity: "Rare", icon: "military_tech", color: "orange", desc: "Completed 10 quests" });
    if (participant.level >= 5) achievements.push({ name: "Rising Star", type: "Achievement", rarity: "Uncommon", icon: "stars", color: "amber", desc: `Reached level ${participant.level}` });
    if (participant.level >= 10) achievements.push({ name: "Elite Warrior", type: "Achievement", rarity: "Epic", icon: "local_fire_department", color: "red", desc: "Reached level 10" });
    if (participant.total_score >= 1000) achievements.push({ name: "Score Master", type: "Achievement", rarity: "Rare", icon: "emoji_events", color: "yellow", desc: "Scored over 1000 total points" });
  }

  const allItems = [
    ...achievements.map((a, i) => ({ ...a, id: `ach-${i}` })),
    ...badges.map((b) => ({ ...b, desc: `Score: ${b.score} | XP: ${b.xp} | Streak: ${b.streak}x` })),
  ];

  const tabs = ["All", "Badge", "Achievement"];
  const filteredItems = filter === "All" ? allItems : allItems.filter((item) => item.type === filter);

  return (
    <div className="max-w-7xl mx-auto relative z-10">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-widest text-xs">
            <MaterialIcon name="backpack" className="text-sm" fill />
            Hero&apos;s Satchel
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight">Inventory</h1>
          <p className="text-on-surface-variant max-w-lg">
            Manage your collected badges, achievements, and quest records.
          </p>
        </div>
        <div className="flex bg-surface-container-low p-1.5 rounded-full shadow-inner border border-outline-variant/10">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-6 py-2.5 rounded-full font-bold transition-all ${
                filter === tab
                  ? "bg-gradient-to-br from-primary to-primary-container text-white shadow-md"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <MaterialIcon name="inventory_2" className="text-6xl text-outline-variant mb-4" />
          <p className="text-on-surface-variant font-medium text-lg">Your inventory is empty</p>
          <p className="text-on-surface-variant text-sm">Complete quests to earn badges and achievements!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filteredItems.map((item, i) => {
            const rarityColors: Record<string, string> = {
              Common: "slate",
              Uncommon: "blue",
              Rare: "orange",
              Epic: "red",
            };
            const rarityColor = rarityColors[item.rarity] ?? "slate";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className="group bg-white/80 backdrop-blur-sm p-4 rounded-3xl bubbly-shadow border border-white/40 hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-12 h-12 bg-${rarityColor}-400/10 rounded-bl-3xl flex items-center justify-center`}>
                  <div className={`w-2 h-2 rounded-full bg-${rarityColor}-400`} />
                </div>
                <div className="aspect-square bg-surface-container-low rounded-2xl flex items-center justify-center mb-4 shadow-inner group-hover:scale-105 transition-transform">
                  <MaterialIcon name={item.icon} className={`text-4xl text-${item.color}-500`} fill />
                </div>
                <h4 className="font-black text-on-surface text-sm truncate">{item.name}</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{item.type}</p>

                <div className="absolute inset-0 bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center rounded-3xl">
                  <p className="text-white font-black text-xs mb-1">{item.rarity}</p>
                  <p className="text-white/80 text-[10px] mb-2">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Inventory Capacity */}
      <div className="mt-12 p-8 bg-primary-container/20 rounded-[3rem] border border-primary/10 flex flex-col md:flex-row items-center gap-8">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
          <MaterialIcon name="inventory_2" className="text-5xl text-primary" fill />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-2xl font-black text-on-surface mb-2">Your Collection</h3>
          <p className="text-on-surface-variant font-medium mb-4">
            You have collected {allItems.length} items. Complete more quests to unlock rare badges!
          </p>
          <div className="h-4 w-full max-w-md bg-white rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.min((allItems.length / 50) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPageWrapper() {
  return <InventoryPage />;
}

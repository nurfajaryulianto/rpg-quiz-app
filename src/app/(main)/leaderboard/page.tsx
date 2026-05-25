"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getLeaderboard, type LeaderboardEntry } from "@/services/leaderboardService";
import { getLevelTitle } from "@/utils/gamification";
import { useAuthStore } from "@/store/authStore";

function LeaderboardPage() {
  const { participant } = useAuthStore();
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    getLeaderboard(100, controller.signal)
      .then((data) => setPlayers(data))
      .catch((e: Error) => {
        if (e.name === "AbortError" || e.message?.includes("abort")) {
          setError("Koneksi lambat — database mungkin sedang bangun dari mode tidur. Klik Coba Lagi.");
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));

    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [retryCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading rankings..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6">
        <MaterialIcon name="wifi_off" className="text-6xl text-outline-variant" />
        <div className="max-w-sm">
          <p className="font-bold text-on-surface text-lg mb-2">Gagal Memuat Leaderboard</p>
          <p className="text-on-surface-variant text-sm">{error}</p>
        </div>
        <button
          onClick={() => setRetryCount((c: number) => c + 1)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors"
        >
          <MaterialIcon name="refresh" />
          Coba Lagi
        </button>
      </div>
    );
  }

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = top3.length === 3
    ? [top3[1], top3[0], top3[2]]
    : top3;

  return (
    <div className="max-w-7xl mx-auto relative z-10">
      {/* Header */}
      <div className="text-center mb-16">
        <span className="inline-block px-4 py-1 bg-surface-container-highest text-primary font-bold rounded-full text-xs uppercase tracking-widest mb-4">
          Hall of Legends
        </span>
        <h1 className="text-5xl md:text-6xl font-black text-on-surface tracking-tight mb-4">Top Heroes</h1>
        <p className="text-on-surface-variant font-medium text-lg max-w-lg mx-auto">
          The most elite warriors and mages in the academy. Will your name be etched here next?
        </p>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-end">
          {podiumOrder.map((hero, i) => {
            if (!hero) return null;
            const rank = players.indexOf(hero) + 1;
            const isFeatured = rank === 1;
            const medalColors = ["text-yellow-600", "text-slate-500", "text-orange-600"];
            const medalColor = medalColors[rank - 1] ?? "text-slate-400";

            return (
              <motion.div
                key={hero.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * i }}
                className={`relative flex flex-col items-center ${isFeatured ? "order-first md:order-none" : ""}`}
              >
                <div className={`relative mb-6 ${isFeatured ? "w-48 h-48" : "w-36 h-36"}`}>
                  <div className="w-full h-full rounded-full bg-surface-container-high border-4 border-white shadow-2xl relative z-10 overflow-hidden flex items-center justify-center">
                    {hero.avatar_url ? (
                      <img src={hero.avatar_url} alt={hero.name} className="w-full h-full object-cover" />
                    ) : (
                      <MaterialIcon name="person" className={`${isFeatured ? "text-6xl" : "text-4xl"} text-primary`} fill />
                    )}
                  </div>
                  <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center z-20 font-black text-xl ${medalColor}`}>
                    {rank}
                  </div>
                </div>
                <h3 className={`font-black text-on-surface ${isFeatured ? "text-2xl" : "text-xl"}`}>
                  {hero.name}
                </h3>
                <p className="text-primary font-bold text-sm mb-2">
                  {getLevelTitle(hero.level)} <span className="text-on-surface-variant opacity-50">|</span> Lv. {hero.level}
                </p>
                <p className="font-black text-on-surface text-lg">{hero.total_score.toLocaleString()} pts</p>
                <div className={`h-24 w-full max-w-[200px] bg-white/40 rounded-t-3xl border-x border-t border-white/40 shadow-inner flex items-end justify-center pb-4 mt-4 ${isFeatured ? "h-32" : "h-24"}`}>
                  <MaterialIcon name="workspace_premium" className={`text-4xl ${medalColor}`} fill />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full Table */}
      {rest.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md rounded-[3rem] bubbly-shadow overflow-hidden border border-white/40">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest">Rank</th>
                <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest">Hero</th>
                <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest hidden md:table-cell">Title</th>
                <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest">Level</th>
                <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100/50">
              {rest.map((hero, i) => {
                const rank = i + 4;
                const isMe = hero.id === participant?.id;
                return (
                  <tr key={hero.id} className={`hover:bg-rose-50/30 transition-colors ${isMe ? "bg-primary-container/10" : ""}`}>
                    <td className="px-8 py-5 font-black text-on-surface-variant">#{rank}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
                          {hero.avatar_url ? (
                            <img src={hero.avatar_url} alt={hero.name} className="w-full h-full object-cover" />
                          ) : (
                            <MaterialIcon name="person" className="text-primary" fill />
                          )}
                        </div>
                        <span className={`font-bold ${isMe ? "text-primary" : "text-on-surface"}`}>
                          {hero.name} {isMe && "(You)"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 hidden md:table-cell">
                      <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-on-surface-variant">
                        {getLevelTitle(hero.level)}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-bold text-primary">Lv. {hero.level}</td>
                    <td className="px-8 py-5 text-right font-black text-on-surface">{hero.total_score.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {players.length === 0 && (
        <div className="text-center py-20">
          <MaterialIcon name="groups" className="text-6xl text-outline-variant mb-4" />
          <p className="text-on-surface-variant font-medium text-lg">No heroes have completed exams yet</p>
          <p className="text-on-surface-variant text-sm">Be the first to make your mark!</p>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPageWrapper() {
  return <LeaderboardPage />;
}

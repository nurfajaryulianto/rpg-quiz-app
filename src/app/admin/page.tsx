"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import { getAdminStats, getRecentActivity } from "@/services/adminService";
import type { ExamSession } from "@/lib/database.types";

type ActivityItem = ExamSession & { participant_name?: string; batch_name?: string };

function StatSkeleton() {
  return (
    <div className="bg-white/80 p-8 rounded-xl bubbly-shadow border border-white/40 animate-pulse">
      <div className="h-3 w-24 bg-surface-container-high rounded mb-3" />
      <div className="h-10 w-16 bg-surface-container-high rounded mb-2" />
      <div className="h-3 w-32 bg-surface-container rounded" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4"><div className="h-4 w-28 bg-surface-container rounded" /></td>
          <td className="px-6 py-4"><div className="h-4 w-20 bg-surface-container rounded" /></td>
          <td className="px-6 py-4"><div className="h-4 w-12 bg-surface-container rounded" /></td>
          <td className="px-6 py-4 text-right"><div className="h-5 w-16 bg-surface-container rounded-full ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<{
    totalBatches: number;
    totalParticipants: number;
    totalQuestions: number;
    activeBatches: number;
    completedExams: number;
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => setStats({
      totalBatches: 0, totalParticipants: 0, totalQuestions: 0, activeBatches: 0, completedExams: 0,
    }));
    getRecentActivity().then(setRecentActivity).catch(() => setRecentActivity([]));
  }, []);

  const statCards = [
    { label: "Total XP Distributed", value: "-", icon: "trending_up", color: "primary" },
    { label: "Active Heroes", value: stats ? stats.totalParticipants.toString() : null, icon: "groups", color: "secondary", sub: stats ? `${stats.activeBatches} active batches` : null },
    { label: "Quests Available", value: stats ? stats.totalBatches.toString() : null, icon: "quiz", color: "tertiary", sub: stats ? `${stats.totalQuestions} total questions` : null },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter mb-2">Guild Master Panel</h1>
          <p className="text-on-surface-variant font-medium text-lg">Managing the elite heroes of Maple Academy</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/admin/batches")}
            className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <MaterialIcon name="add_circle" />
            New Quest
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {stats === null
          ? Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map((stat, i) => (
          <div
            key={i}
            className="bg-white/80 p-8 rounded-xl bubbly-shadow border border-white/40 relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
              <MaterialIcon name={stat.icon} className="text-9xl" fill />
            </div>
            <p className="text-primary font-bold uppercase tracking-widest text-sm mb-1">{stat.label}</p>
            <h3 className="text-4xl font-black text-on-surface">
              {stat.value} <span className="text-xl font-bold opacity-70">{stat.color === "secondary" ? "Heroes" : ""}</span>
            </h3>
            {stat.sub && <p className="mt-2 text-on-surface-variant text-sm font-medium italic">{stat.sub}</p>}
          </div>
        ))}
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-on-surface flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                <MaterialIcon name="history" />
              </span>
              Recent Activity
            </h2>
            <button
              onClick={() => router.push("/admin/results")}
              className="text-primary font-bold text-sm hover:underline"
            >
              View All
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-xl bubbly-shadow overflow-hidden">
            {recentActivity === null ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">Hero</th>
                      <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">Quest</th>
                      <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">Score</th>
                      <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    <ActivitySkeleton />
                  </tbody>
                </table>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant">No activity yet</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">Hero</th>
                        <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">Quest</th>
                        <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">Score</th>
                        <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {recentActivity.slice(0, 8).map((a) => (
                        <tr key={a.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                                <MaterialIcon name="person" className="text-sm text-primary" fill />
                              </div>
                              <span className="font-bold text-sm">{a.participant_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-on-surface-variant">{a.batch_name}</td>
                          <td className="px-6 py-4 font-bold text-primary">{a.score} pts</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              a.status === "completed"
                                ? "bg-tertiary-container text-on-tertiary-container"
                                : a.status === "timed_out"
                                ? "bg-error-container/20 text-error"
                                : "bg-secondary-container text-on-secondary-container"
                            }`}>
                              {a.status === "completed" ? "Done" : a.status === "timed_out" ? "Timed Out" : "In Progress"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-on-surface flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <MaterialIcon name="bolt" />
            </span>
            Quick Actions
          </h2>

          <div className="space-y-4">
            {[
              { label: "Manage Batches", desc: stats ? `${stats.totalBatches} batches created` : "Loading...", icon: "quiz", href: "/admin/batches" },
              { label: "Manage Questions", desc: stats ? `${stats.totalQuestions} questions total` : "Loading...", icon: "help_outline", href: "/admin/questions" },
              { label: "Manage Participants", desc: stats ? `${stats.totalParticipants} heroes` : "Loading...", icon: "groups", href: "/admin/participants" },
              { label: "View Results", desc: stats ? `${stats.completedExams} exams completed` : "Loading...", icon: "analytics", href: "/admin/results" },
            ].map((action) => (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="w-full bg-white p-6 rounded-xl bubbly-shadow flex items-center gap-4 hover:-translate-y-1 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <MaterialIcon name={action.icon} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-on-surface">{action.label}</p>
                  <p className="text-xs text-on-surface-variant">{action.desc}</p>
                </div>
                <MaterialIcon name="arrow_forward_ios" className="text-sm text-outline-variant" />
              </button>
            ))}
          </div>

          {/* Quick Guide */}
          <div className="bg-primary-container/20 p-6 rounded-xl border border-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <MaterialIcon name="auto_stories" className="text-primary" />
              <h3 className="font-bold text-on-surface">Quick Start Guide</h3>
            </div>
            <ol className="text-on-surface-variant text-sm space-y-2 list-decimal list-inside">
              <li>Create a <strong className="text-on-surface">Batch</strong> (quiz session)</li>
              <li>Add <strong className="text-on-surface">Questions</strong> manually or via Excel</li>
              <li>Add <strong className="text-on-surface">Participants</strong></li>
              <li>Set batch to <strong className="text-tertiary">Active</strong></li>
              <li>Monitor <strong className="text-on-surface">Results</strong> in real-time</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

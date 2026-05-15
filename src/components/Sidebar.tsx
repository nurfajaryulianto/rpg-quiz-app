"use client";

import { useRouter, usePathname } from "next/navigation";
import MaterialIcon from "./MaterialIcon";
import { useAuthStore } from "@/store/authStore";
import { getXPProgress, getLevelTitle } from "@/utils/gamification";

const navItems = [
  { href: "/",          id: "home",        label: "Home",        icon: "home" },
  { href: "/quests",    id: "quests",      label: "Quests",      icon: "foundation" },
  { href: "/leaderboard", id: "leaderboard", label: "Leaderboard", icon: "leaderboard" },
  { href: "/inventory", id: "inventory",   label: "Inventory",   icon: "backpack" },
  { href: "/character", id: "character",   label: "Character",   icon: "person" },
  { href: "/admin",     id: "admin",       label: "Admin",       icon: "shield_person", fill: true, adminOnly: true },
  { href: "/admin/analytics", id: "analytics", label: "Analytics", icon: "insights", fill: true, adminOnly: true },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { participant } = useAuthStore();

  const levelTitle = participant ? getLevelTitle(participant.level) : "Novice";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-full flex-col py-8 z-40 bg-rose-50 dark:bg-pink-950 w-64 rounded-r-[3rem] overflow-hidden shadow-xl shadow-rose-200/50 hidden lg:flex">
      <div className="mt-20 px-6 mb-8">
        <div className="flex items-center gap-4 mb-6 p-4 bg-white/50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
            <MaterialIcon name="shield_person" className="text-white" fill />
          </div>
          <div>
            <p className="font-bold text-on-surface leading-none truncate max-w-[140px]">
              {participant?.name ?? "Hero"}
            </p>
            <p className="text-xs text-on-surface-variant font-medium">
              Level {participant?.level ?? 1} {levelTitle}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems
          .filter((item) => !item.adminOnly || participant?.role === "admin")
          .map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`w-full px-6 py-3 mx-2 my-1 flex items-center gap-4 transition-all group rounded-full ${
                isActive(item.href)
                  ? "bg-gradient-to-br from-rose-500 to-rose-400 text-white shadow-lg shadow-rose-300/50"
                  : "text-rose-700/70 hover:bg-white/80"
              }`}
            >
              <MaterialIcon
                name={item.icon}
                className="group-hover:scale-110 transition-transform"
                fill={item.fill || isActive(item.href)}
              />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
      </nav>

      <div className="px-4 mt-auto pb-4" />
    </aside>
  );
}

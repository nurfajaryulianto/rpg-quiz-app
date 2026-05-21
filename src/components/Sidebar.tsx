"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import MaterialIcon from "./MaterialIcon";
import { useAuthStore } from "@/store/authStore";
import { getXPProgress, getLevelTitle } from "@/utils/gamification";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const navItems = [
  { href: "/",          id: "home",        label: "Home",        icon: "home",           roles: ["participant", "supervisor", "admin"] },
  { href: "/quests",    id: "quests",      label: "Exams",       icon: "foundation",      roles: ["participant", "supervisor"] },
  { href: "/leaderboard", id: "leaderboard", label: "Leaderboard", icon: "leaderboard",  roles: ["participant", "supervisor", "admin"] },
  { href: "/inventory", id: "inventory",   label: "Learning Materials", icon: "backpack",        roles: ["participant", "supervisor"] },
  { href: "/character", id: "character",   label: "Character",   icon: "person",          roles: ["participant", "supervisor"] },
  { href: "/supervisor", id: "supervisor", label: "Grade Essay",  icon: "grading", fill: true, roles: ["supervisor"] },
  { href: "/admin",     id: "admin",       label: "Guild Master Panel", icon: "shield_person", fill: true, roles: ["admin"] },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { participant, logout } = useAuthStore();

  const levelTitle = participant ? getLevelTitle(participant.level) : "Novice";
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-full flex-col py-8 z-40 bg-rose-50 dark:bg-pink-950 w-64 rounded-r-[3rem] overflow-hidden shadow-xl shadow-rose-200/50 hidden lg:flex">
      <div className="mt-20 px-6 mb-8">
        <button
          onClick={() => router.push("/profile")}
          className={`flex items-center gap-4 mb-6 p-4 rounded-xl w-full text-left transition-colors ${
            isActive("/profile")
              ? "bg-white/90 border-2 border-primary/30 shadow-sm"
              : "bg-white/50 hover:bg-white/80"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center overflow-hidden flex-shrink-0">
            {participant?.avatar_url ? (
              <img src={participant.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <MaterialIcon name="shield_person" className="text-white" fill />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-on-surface leading-none truncate max-w-[140px]">
              {participant?.name ?? "Hero"}
            </p>
            <p className="text-xs text-on-surface-variant font-medium">
              Level {participant?.level ?? 1} {levelTitle}
            </p>
          </div>
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems
          .filter((item) => item.roles.includes(participant?.role ?? "participant"))
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

      <div className="px-4 mt-auto pb-6">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-colors text-sm font-semibold"
        >
          <MaterialIcon name="logout" className="text-base" />
          Logout
        </button>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Logout"
        message="Apakah kamu yakin ingin keluar dari sesi ini?"
        icon="logout"
        confirmLabel="Ya, Logout"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </aside>
  );
}

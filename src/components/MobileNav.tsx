"use client";

import { useRouter, usePathname } from "next/navigation";
import MaterialIcon from "./MaterialIcon";
import { useAuthStore } from "@/store/authStore";

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { participant, logout } = useAuthStore();

  const role = participant?.role ?? "participant";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navItems = [
    { href: "/",          id: "home",        icon: "home",         label: "Home" },

    // Quests — participant and supervisor
    ...(!isAdmin ? [
      { href: "/quests", id: "quests", icon: "foundation", label: "Quests" },
    ] : []),

    // Special center button
    ...(isAdmin
      ? [{ href: "/admin",      id: "admin",      icon: "shield_person", label: "Admin",  special: true }]
      : isSupervisor
      ? [{ href: "/supervisor", id: "supervisor", icon: "grading",       label: "Grade", special: true }]
      : []),

    { href: "/leaderboard", id: "leaderboard", icon: "leaderboard", label: "Rank" },

    // Inventory — participant only
    ...(!isAdmin && !isSupervisor ? [
      { href: "/inventory", id: "inventory", icon: "backpack", label: "Items" },
    ] : []),

    // Account/Profile — participant and supervisor (admins use the logout button below)
    ...(!isAdmin ? [
      { href: "/profile", id: "profile", icon: "manage_accounts", label: "Account" },
    ] : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg flex justify-around items-center py-4 z-50 rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] px-6">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => router.push(item.href)}
          className={`flex flex-col items-center gap-1 ${
            "special" in item && item.special
              ? "bg-primary-container text-on-primary-container p-3 rounded-full -mt-10 shadow-lg shadow-primary/30"
              : isActive(item.href)
              ? "text-primary"
              : "text-rose-400"
          }`}
        >
          <MaterialIcon
            name={item.icon}
            fill={"special" in item ? !!item.special : isActive(item.href)}
          />
          {!("special" in item && item.special) && (
            <span className="text-[10px] font-bold uppercase tracking-tighter">
              {item.label}
            </span>
          )}
        </button>
      ))}

      {/* Logout button — only shown for admin (other roles use the Account/Profile page) */}
      {isAdmin && (
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-rose-400"
        >
          <MaterialIcon name="logout" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Logout</span>
        </button>
      )}
    </nav>
  );
}


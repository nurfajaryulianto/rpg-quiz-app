"use client";

import { useRouter, usePathname } from "next/navigation";
import MaterialIcon from "./MaterialIcon";
import { useAuthStore } from "@/store/authStore";

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { participant } = useAuthStore();

  const navItems = [
    { href: "/", id: "home", icon: "home", label: "Home" },
    { href: "/quests", id: "quests", icon: "foundation", label: "Quests" },
    ...(participant?.role === "admin"
      ? [{ href: "/admin", id: "admin", icon: "shield_person", label: "Admin", special: true }]
      : []),
    { href: "/leaderboard", id: "leaderboard", icon: "leaderboard", label: "Rank" },
    { href: "/inventory", id: "inventory", icon: "backpack", label: "Items" },
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
    </nav>
  );
}

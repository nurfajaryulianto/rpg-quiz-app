"use client";

import { useRouter, usePathname } from "next/navigation";
import MaterialIcon from "./MaterialIcon";
import { useAuthStore } from "@/store/authStore";

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { participant } = useAuthStore();

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-white/70 backdrop-blur-xl shadow-[0_12px_40px_0_rgba(74,33,53,0.06)] rounded-b-[3rem]">
      <div className="flex items-center gap-4">
        <span
          className="text-2xl font-black text-rose-800 drop-shadow-sm tracking-tight cursor-pointer"
          onClick={() => router.push("/")}
        >
          Maple Academy
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-8 mr-8">
          <button
            onClick={() => router.push("/")}
            className={`font-semibold hover:scale-105 transition-transform duration-200 ${
              pathname === "/" ? "text-rose-900 font-extrabold scale-105 underline decoration-4 underline-offset-8 decoration-primary-container" : "text-rose-400"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => router.push("/quests")}
            className={`font-semibold hover:scale-105 transition-transform duration-200 ${
              pathname === "/quests" ? "text-rose-900 font-extrabold scale-105 underline decoration-4 underline-offset-8 decoration-primary-container" : "text-rose-400"
            }`}
          >
            Quests
          </button>
          {participant?.role === "admin" && (
            <button
              onClick={() => router.push("/admin")}
              className={`font-semibold hover:scale-105 transition-transform duration-200 ${
                pathname.startsWith("/admin") ? "text-rose-900 font-extrabold scale-105 underline decoration-4 underline-offset-8 decoration-primary-container" : "text-rose-400"
              }`}
            >
              Admin
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/leaderboard")}
            className="p-2 rounded-full hover:bg-rose-50 transition-all active:scale-95"
          >
            <MaterialIcon name="leaderboard" className="text-rose-600" />
          </button>
          <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-primary-container overflow-hidden flex items-center justify-center">
            <MaterialIcon name="person" className="text-primary" fill />
          </div>
        </div>
      </div>
    </header>
  );
}

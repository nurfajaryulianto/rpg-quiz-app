"use client";

import { useRouter } from "next/navigation";

export default function TopBar() {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center px-8 h-20 bg-white/70 backdrop-blur-xl shadow-[0_12px_40px_0_rgba(74,33,53,0.06)] rounded-b-[3rem]">
      <span
        className="text-2xl font-black text-rose-800 drop-shadow-sm tracking-tight cursor-pointer"
        onClick={() => router.push("/")}
      >
        Maple Academy
      </span>
    </header>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import AuthProvider from "@/components/AuthProvider";
import TopBar from "@/components/TopBar";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { participant, user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return; // wait until auth is confirmed before redirecting
    if (!user) {
      router.push("/login");
    } else if (participant && participant.role !== "admin") {
      router.push("/");
    }
  }, [user, participant, isInitialized, router]);

  if (!isInitialized || !user || !participant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (participant.role !== "admin") {
    return null;
  }

  const navItems = [
    { href: "/admin",                    label: "Overview",    icon: "dashboard" },
    { href: "/admin/batches",            label: "Batches",     icon: "quiz" },
    { href: "/admin/questions",          label: "Questions",   icon: "help_outline" },
    { href: "/admin/participants",       label: "Participants", icon: "groups" },
    { href: "/admin/results",            label: "Results",     icon: "analytics" },
    { href: "/admin/question-archives",  label: "Bank Soal",   icon: "library_books" },
    { href: "/supervisor",               label: "Grade Essay",  icon: "grading" },
    { href: "/admin/analytics",          label: "Analytics",   icon: "insights" },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <TopBar />

      <div className="flex pt-20">
        {/* Admin Sidebar */}
        <aside className="fixed left-0 top-20 h-[calc(100vh-5rem)] w-64 bg-rose-50 rounded-r-[2rem] shadow-xl shadow-rose-200/30 hidden lg:flex flex-col py-8 z-30">
          <div className="px-6 mb-8">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-rose-700/70 hover:text-primary font-semibold text-sm mb-6 transition-colors"
            >
              <MaterialIcon name="arrow_back" className="text-sm" />
              Back to Home
            </button>
            <h2 className="text-xl font-black text-on-surface flex items-center gap-3">
              <MaterialIcon name="shield_person" className="text-primary" fill />
              Guild Master Panel
            </h2>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full px-5 py-3 flex items-center gap-3 transition-all rounded-xl text-left ${
                  pathname === item.href
                    ? "bg-gradient-to-br from-rose-500 to-rose-400 text-white shadow-lg shadow-rose-300/50"
                    : "text-rose-700/70 hover:bg-white/80"
                }`}
              >
                <MaterialIcon name={item.icon} fill={pathname === item.href} />
                <span className="font-semibold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Admin Nav */}
        <div className="lg:hidden fixed top-20 left-0 w-full z-30 bg-white/90 backdrop-blur-lg border-b border-rose-100 px-4 py-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 text-sm font-semibold text-rose-700/70 whitespace-nowrap flex items-center gap-1"
          >
            <MaterialIcon name="arrow_back" className="text-sm" />
          </button>
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`px-4 py-2 text-sm transition-all rounded-full whitespace-nowrap ${
                pathname === item.href
                  ? "bg-primary text-white font-bold"
                  : "text-on-surface-variant hover:bg-rose-50 font-medium"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 pt-4 lg:pt-8 pb-12 px-4 md:px-8 mt-12 lg:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthProvider>
  );
}

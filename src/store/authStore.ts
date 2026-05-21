import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Participant } from "@/lib/database.types";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  participant: Participant | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (nik: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setParticipant: (p: Participant | null) => void;
}

const NIK_EMAIL_DOMAIN = "ksm.local";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  participant: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    // Mark as initialized immediately to prevent concurrent duplicate calls
    // (e.g. React strict-mode double-mount or multiple AuthProvider instances).
    set({ isInitialized: true, isLoading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: participant } = await supabase
          .from("participants")
          .select("id, user_id, name, email, nik, role, area, jabatan, sub_dept, level, xp, total_score, quizzes_taken, avatar_url, avatar_config, created_at, updated_at")
          .eq("user_id", session.user.id)
          .limit(1)
          .maybeSingle();

        set({
          user: session.user,
          participant: participant ?? null,
        });
      }
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth state changes (token refresh, sign-out, etc.).
    // Skip INITIAL_SESSION — already handled by getSession() above.
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "SIGNED_OUT") {
        set({ user: null, participant: null });
        return;
      }
      if (session?.user) {
        const { data: freshParticipant } = await supabase
          .from("participants")
          .select("id, user_id, name, email, nik, role, area, jabatan, sub_dept, level, xp, total_score, quizzes_taken, avatar_url, avatar_config, created_at, updated_at")
          .eq("user_id", session.user.id)
          .limit(1)
          .maybeSingle();

        set({
          user: session.user,
          // If the re-fetch fails (e.g. network hiccup after idle), keep the
          // current participant so pages don't get stuck on the error screen.
          participant: freshParticipant ?? get().participant,
        });
      }
    });
  },

  login: async (nik: string, password: string) => {
    set({ isLoading: true });
    try {
      const email = `${nik}@${NIK_EMAIL_DOMAIN}`;
      console.log("[AUTH] Logging in with email:", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("[AUTH] Sign-in error:", error.message);
        throw error;
      }
      console.log("[AUTH] Sign-in success, user:", data.user?.id);

      if (data.user) {
        const { data: participant, error: pError } = await supabase
          .from("participants")
          .select("id, user_id, name, email, nik, role, area, jabatan, sub_dept, level, xp, total_score, quizzes_taken, avatar_url, avatar_config, created_at, updated_at")
          .eq("user_id", data.user.id)
          .limit(1)
          .maybeSingle();

        if (pError) {
          console.error("[AUTH] Participant query error:", pError.message, pError);
        } else {
          console.log("[AUTH] Participant loaded:", participant?.name, participant?.role);
        }

        set({
          user: data.user,
          participant: participant ?? null,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, participant: null });
  },

  setParticipant: (p) => set({ participant: p }),
}));

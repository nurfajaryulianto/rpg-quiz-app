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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setParticipant: (p: Participant | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  participant: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: participant } = await supabase
          .from("participants")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        set({
          user: session.user,
          participant: participant ?? null,
        });
      }
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        set({ user: null, participant: null });
        return;
      }
      if (session?.user) {
        const { data: participant } = await supabase
          .from("participants")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        set({
          user: session.user,
          participant: participant ?? null,
        });
      }
    });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const { data: participant } = await supabase
          .from("participants")
          .select("*")
          .eq("user_id", data.user.id)
          .single();

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

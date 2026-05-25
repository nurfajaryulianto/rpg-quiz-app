import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Participant } from "@/lib/database.types";
import type { User, RealtimeChannel } from "@supabase/supabase-js";

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

// ── Single-device session nonce ─────────────────────────────────────────────
// One Realtime channel per browser tab.  Replaced on every login, cleaned up
// on logout / sign-out event.
let sessionNonceChannel: RealtimeChannel | null = null;

// Auth state subscription — stored so it can be unsubscribed on cleanup.
let authStateSubscription: { unsubscribe: () => void } | null = null;

function nonceKey(participantId: string) {
  return `_sn_${participantId}`;
}

/**
 * Subscribe to Realtime changes on the participant's row.
 * If `current_session_id` changes to something different from what we stored
 * in localStorage → another device logged in → sign this session out.
 */
function startNonceWatcher(participantId: string) {
  // Remove any previous subscription
  if (sessionNonceChannel) {
    supabase.removeChannel(sessionNonceChannel);
  }

  sessionNonceChannel = supabase
    .channel(`nonce:${participantId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "participants",
        filter: `id=eq.${participantId}`,
      },
      async (payload) => {
        const newNonce = (payload.new as { current_session_id?: string | null })
          .current_session_id;
        const localNonce = localStorage.getItem(nonceKey(participantId));

        // If both exist and differ → we were displaced by a new login elsewhere
        if (newNonce && localNonce && newNonce !== localNonce) {
          localStorage.removeItem(nonceKey(participantId));
          await supabase.auth.signOut();
          // onAuthStateChange SIGNED_OUT handler will clear the store state
        }
      }
    )
    .subscribe();
}
// ───────────────────────────────────────────────────────────────────────────

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

    // Clean up any previous auth subscription (hot-reload safety)
    if (authStateSubscription) {
      authStateSubscription.unsubscribe();
      authStateSubscription = null;
    }

    try {
      // getSession() can hang indefinitely when the stored access token is
      // expired and Supabase tries to refresh it over a stale TCP connection
      // (common when coming back to an idle browser tab).  Race it against an
      // 8-second timeout so we always unblock the loading screen.
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 8000)
        ),
      ]);

      const session = sessionResult.data.session;

      if (session?.user) {
        // Add an abort timeout to the DB query for the same reason: a stale
        // connection would cause this fetch to hang after idle time.
        const controller = new AbortController();
        const dbTimeoutId = setTimeout(() => controller.abort(), 8000);

        let participant: Participant | null = null;
        try {
          const { data } = await supabase
            .from("participants")
            .select("id, user_id, name, email, nik, role, area, jabatan, sub_dept, level, xp, total_score, quizzes_taken, avatar_url, avatar_config, current_session_id, created_at, updated_at")
            .eq("user_id", session.user.id)
            .limit(1)
            .abortSignal(controller.signal)
            .maybeSingle();
          participant = data;
        } catch {
          // AbortError (timeout) or network error — treat as no participant found
        } finally {
          clearTimeout(dbTimeoutId);
        }

        if (participant) {
          // Single-device check: if we have a stored nonce but it doesn't match
          // the DB nonce, this session was displaced by another device.
          const storedNonce = localStorage.getItem(nonceKey(participant.id));
          const dbNonce = participant.current_session_id;

          if (storedNonce && dbNonce && storedNonce !== dbNonce) {
            // Stale session — clear local state and sign out silently.
            // Wrap signOut() so a stale/timed-out connection can't prevent
            // isLoading from being cleared in the outer finally block.
            localStorage.removeItem(nonceKey(participant.id));
            try {
              await supabase.auth.signOut();
            } catch {
              // signOut failed (e.g. network timeout) — clear state anyway
            }
            set({ user: null, participant: null });
            return;
          }

          set({ user: session.user, participant });

          // Re-attach watcher if we already have a nonce from a previous login
          if (storedNonce) {
            startNonceWatcher(participant.id);
          }
        } else {
          set({ user: session.user, participant: null });
        }
      }
    } catch {
      // Catches any error that escapes the inner blocks — most likely an AbortError
      // from the global 15 s fetch timeout firing on getSession() before our
      // Promise.race 8 s safety resolves. Treat as unauthenticated and unblock.
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth state changes (token refresh, sign-out, etc.).
    // Skip INITIAL_SESSION — already handled by getSession() above.
    // Store the subscription so it can be cleaned up if needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "SIGNED_OUT") {
        // Clean up Realtime nonce watcher
        if (sessionNonceChannel) {
          supabase.removeChannel(sessionNonceChannel);
          sessionNonceChannel = null;
        }
        set({ user: null, participant: null });
        return;
      }
      // TOKEN_REFRESHED or USER_UPDATED — re-sync participant data
      if (session?.user) {
        const controller = new AbortController();
        const dbTimeoutId = setTimeout(() => controller.abort(), 8000);

        let freshParticipant: Participant | null = null;
        try {
          const { data } = await supabase
            .from("participants")
            .select("id, user_id, name, email, nik, role, area, jabatan, sub_dept, level, xp, total_score, quizzes_taken, avatar_url, avatar_config, current_session_id, created_at, updated_at")
            .eq("user_id", session.user.id)
            .limit(1)
            .abortSignal(controller.signal)
            .maybeSingle();
          freshParticipant = data;
        } catch {
          // Timeout or network error — keep existing participant (handled below)
        } finally {
          clearTimeout(dbTimeoutId);
        }

        set({
          user: session.user,
          // If the re-fetch fails (e.g. network hiccup after idle), keep the
          // current participant so pages don't get stuck on the error screen.
          participant: freshParticipant ?? get().participant,
        });
      }
    });

    // Store subscription reference for future cleanup (e.g. on hot-reload)
    authStateSubscription = subscription;
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
          .select("id, user_id, name, email, nik, role, area, jabatan, sub_dept, level, xp, total_score, quizzes_taken, avatar_url, avatar_config, current_session_id, created_at, updated_at")
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

        // Single-device enforcement: generate a new nonce, persist to DB + localStorage
        if (participant) {
          const nonce = crypto.randomUUID();
          const { error: nonceErr } = await supabase
            .from("participants")
            .update({ current_session_id: nonce })
            .eq("id", participant.id);

          if (!nonceErr) {
            // Only store locally once DB write succeeds (prevents false kick on next init)
            localStorage.setItem(nonceKey(participant.id), nonce);
            startNonceWatcher(participant.id);
          }
        }
      }
    } catch (err) {
      // Translate network timeout (AbortError from the global 15 s fetch deadline)
      // into a readable message. All other errors are re-thrown unchanged so the
      // login form can display them (e.g. invalid credentials).
      if (
        err instanceof Error &&
        (err.name === "AbortError" || err.message.toLowerCase().includes("abort"))
      ) {
        throw new Error(
          "Koneksi bermasalah atau timeout. Coba refresh halaman dan login kembali."
        );
      }
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const participant = get().participant;
    if (participant) {
      localStorage.removeItem(nonceKey(participant.id));
    }
    if (sessionNonceChannel) {
      supabase.removeChannel(sessionNonceChannel);
      sessionNonceChannel = null;
    }
    await supabase.auth.signOut();
    set({ user: null, participant: null });
  },

  setParticipant: (p) => set({ participant: p }),
}));


import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Participant } from "@/lib/database.types";
import type { User, RealtimeChannel } from "@supabase/supabase-js";

/** Info about who kicked the current session off. */
export interface KickedInfo {
  /** IP address of the new login that displaced this session. */
  ip: string;
}

interface AuthState {
  user: User | null;
  participant: Participant | null;
  isLoading: boolean;
  isInitialized: boolean;
  /** Set when another device/IP logs in with the same account. Non-null triggers the kick banner. */
  kickedInfo: KickedInfo | null;

  initialize: () => Promise<void>;
  login: (nik: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setParticipant: (p: Participant | null) => void;
  /** Clear the kick notification (called after countdown finishes). */
  clearKick: () => void;
  /** Perform cleanup + Supabase signOut after the kick countdown. */
  performKickLogout: () => Promise<void>;
}

const NIK_EMAIL_DOMAIN = "ksm.local";

// Columns fetched for every participant query — single source of truth.
const PARTICIPANT_SELECT =
  "id, user_id, name, email, nik, role, area, jabatan, sub_dept, level, xp, total_score, quizzes_taken, avatar_url, avatar_config, current_session_id, created_at, updated_at";

/** Fetch a participant row by Supabase auth user_id. Returns null on not-found or timeout. */
async function fetchParticipantByUserId(
  userId: string,
  signal?: AbortSignal
): Promise<Participant | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  const sig = signal ?? controller.signal;
  try {
    const { data } = await supabase
      .from("participants")
      .select(PARTICIPANT_SELECT)
      .eq("user_id", userId)
      .limit(1)
      .abortSignal(sig)
      .maybeSingle();
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Single-device session nonce ─────────────────────────────────────────────
// One Realtime channel per browser tab.  Replaced on every login, cleaned up
// on logout / sign-out event.
let sessionNonceChannel: RealtimeChannel | null = null;

// Auth state subscription — stored so it can be unsubscribed on cleanup.
let authStateSubscription: { unsubscribe: () => void } | null = null;

function nonceKey(participantId: string) {
  return `_sn_${participantId}`;
}

// ── Session value helpers ──────────────────────────────────────────────────
// We encode the IP into the session value so it can be shown in the kick banner.
// Format stored in DB + localStorage: "<uuid>|<ip>"

function encodeSessionValue(nonce: string, ip: string): string {
  return `${nonce}|${ip}`;
}

function decodeSessionIp(sessionValue: string): string {
  const parts = sessionValue.split("|");
  // parts[0] = nonce UUID, parts[1] = IP (may be absent in old-format values)
  return parts.length >= 2 ? parts.slice(1).join("|") : "perangkat lain";
}
// ──────────────────────────────────────────────────────────────────────────

/**
 * Fetch the client's IP address from our own API endpoint.
 * Returns "unknown" on any failure (offline, dev environment, etc.).
 */
async function getClientIp(): Promise<string> {
  try {
    const res = await fetch("/api/auth/get-ip", { cache: "no-store" });
    if (!res.ok) return "unknown";
    const json = (await res.json()) as { ip?: string };
    return json.ip ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Subscribe to Realtime changes on the participant's row.
 * If `current_session_id` changes to something different from what we stored
 * in localStorage → another device/IP logged in → show the kick banner.
 * The banner handles the actual signOut after a countdown.
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
      (payload) => {
        const newSessionValue = (payload.new as { current_session_id?: string | null })
          .current_session_id;
        const localSessionValue = localStorage.getItem(nonceKey(participantId));

        // If both exist and differ → we were displaced by a new login elsewhere
        if (newSessionValue && localSessionValue && newSessionValue !== localSessionValue) {
          localStorage.removeItem(nonceKey(participantId));
          // Extract the new login's IP from the session value and trigger the kick banner.
          // The banner component will call performKickLogout() after the countdown.
          const kickedFromIp = decodeSessionIp(newSessionValue);
          useAuthStore.setState({ kickedInfo: { ip: kickedFromIp } });
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
  kickedInfo: null,

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
        const participant = await fetchParticipantByUserId(session.user.id);

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
        const freshParticipant = await fetchParticipantByUserId(session.user.id);

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const participant = await fetchParticipantByUserId(data.user.id);

        set({
          user: data.user,
          participant,
        });

        // Single-device enforcement: generate a new nonce, get client IP, persist to DB + localStorage.
        if (participant) {
          const nonce = crypto.randomUUID();
          const clientIp = await getClientIp();
          const sessionValue = encodeSessionValue(nonce, clientIp);

          const { error: nonceErr } = await supabase
            .from("participants")
            .update({ current_session_id: sessionValue })
            .eq("id", participant.id);

          if (!nonceErr) {
            // Only store locally once DB write succeeds (prevents false kick on next init)
            localStorage.setItem(nonceKey(participant.id), sessionValue);
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
    set({ user: null, participant: null, kickedInfo: null });
  },

  setParticipant: (p) => set({ participant: p }),

  clearKick: () => set({ kickedInfo: null }),

  performKickLogout: async () => {
    // Clean up realtime channel and local nonce before signing out.
    const participant = get().participant;
    if (participant) {
      localStorage.removeItem(nonceKey(participant.id));
    }
    if (sessionNonceChannel) {
      supabase.removeChannel(sessionNonceChannel);
      sessionNonceChannel = null;
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Sign-out can fail on stale connections — clear state regardless.
    }
    set({ user: null, participant: null, kickedInfo: null });
  },
}));


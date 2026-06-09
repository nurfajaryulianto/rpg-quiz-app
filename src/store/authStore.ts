import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Participant } from "@/lib/database.types";
import type { User, RealtimeChannel } from "@supabase/supabase-js";

/** Info about who displaced this session (fires after a challenge timeout or accept). */
export interface KickedInfo {
  ip: string;
}

/** Incoming login challenge — another device is trying to use the same account. */
export interface SessionChallenge {
  challengeId: string;
  ip: string;
}

interface AuthState {
  user: User | null;
  participant: Participant | null;
  isLoading: boolean;
  isInitialized: boolean;
  /** Set when the current session was displaced (session_taken broadcast). Triggers kick banner. */
  kickedInfo: KickedInfo | null;
  /** Set when a new device is challenging for this account. Triggers challenge banner. */
  sessionChallenge: SessionChallenge | null;

  initialize: () => Promise<void>;
  login: (nik: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setParticipant: (p: Participant | null) => void;
  clearKick: () => void;
  performKickLogout: () => Promise<void>;
  /** Respond to an incoming login challenge. 'deny' keeps this session; 'allow' logs out and lets the new device in. */
  respondToChallenge: (action: "deny" | "allow") => Promise<void>;
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

// ── Session guard via Supabase Broadcast ────────────────────────────────────
// Broadcast channels work without any DB Realtime publication setup and deliver
// messages in real-time over WebSocket to all subscribed clients.
//
// Channel name: `session-guard:{participantId}` (unique per participant)
// Events:
//   login_challenge   B → all   {challengeId, ip}          new device is trying to login
//   challenge_response A → all  {challengeId, action}      existing session responds
//   session_taken     B → all   {ip}                       new login succeeded, old session displaced

// Prevents concurrent initialize() calls during the async operation.
// Using a module-level flag (not store state) so isInitialized stays FALSE
// until initialization is 100% complete — AuthProvider uses isInitialized to
// block rendering until the DB has warmed up and auth is fully resolved.
let _initCalled = false;

let guardChannel: RealtimeChannel | null = null;
let authStateSubscription: { unsubscribe: () => void } | null = null;

function nonceKey(participantId: string) {
  return `_sn_${participantId}`;
}

function encodeSessionValue(nonce: string, ip: string): string {
  return `${nonce}|${ip}`;
}
// ───────────────────────────────────────────────────────────────────────────

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
 * Subscribe to the session-guard broadcast channel for this participant.
 * Handles incoming login_challenge (show choice banner) and
 * session_taken (show kicked banner) events.
 * Must be called after writing a new session value to DB + localStorage.
 */
function subscribeGuardChannel(participantId: string, mySessionValue: string) {
  if (guardChannel) {
    supabase.removeChannel(guardChannel);
  }

  guardChannel = supabase
    .channel(`session-guard:${participantId}`)
    .on("broadcast", { event: "login_challenge" }, ({ payload }) => {
      // Verify we still own the active session before showing the banner.
      const localSV = localStorage.getItem(nonceKey(participantId));
      if (localSV !== mySessionValue) return;

      useAuthStore.setState({
        sessionChallenge: {
          challengeId: payload.challengeId as string,
          ip: (payload.ip as string) ?? "perangkat lain",
        },
      });
    })
    .on("broadcast", { event: "session_taken" }, ({ payload }) => {
      // A new login succeeded and displaced our session.
      const localSV = localStorage.getItem(nonceKey(participantId));
      if (localSV !== mySessionValue) return;

      localStorage.removeItem(nonceKey(participantId));
      useAuthStore.setState({
        kickedInfo: { ip: (payload.ip as string) ?? "perangkat lain" },
      });
    })
    .subscribe();
}

/**
 * Broadcast a login_challenge to any active session on this participant's guard channel.
 * Waits up to CHALLENGE_TIMEOUT_MS for a challenge_response.
 *
 * Returns:
 *   'allow'   — existing session owner explicitly allowed the new login
 *   'deny'    — existing session owner denied the new login
 *   'timeout' — no response received within timeout → new login proceeds
 */
const CHALLENGE_TIMEOUT_MS = 10_000;

async function sendLoginChallenge(
  participantId: string,
  challengeId: string,
  ip: string
): Promise<"allow" | "deny" | "timeout"> {
  return new Promise<"allow" | "deny" | "timeout">((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        supabase.removeChannel(tempCh);
        resolve("timeout");
      }
    }, CHALLENGE_TIMEOUT_MS);

    const tempCh = supabase
      .channel(`session-guard:${participantId}`)
      .on("broadcast", { event: "challenge_response" }, ({ payload }) => {
        if ((payload.challengeId as string) === challengeId && !settled) {
          settled = true;
          clearTimeout(timer);
          supabase.removeChannel(tempCh);
          resolve(payload.action as "allow" | "deny");
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Broadcast once subscribed so existing sessions can receive it
          await tempCh.send({
            type: "broadcast",
            event: "login_challenge",
            payload: { challengeId, ip },
          });
        }
      });
  });
}
// ───────────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  participant: null,
  isLoading: false,
  isInitialized: false,
  kickedInfo: null,
  sessionChallenge: null,

  initialize: async () => {
    // isInitialized: already done (normal case)
    // _initCalled: concurrent call arrived while async init is still running (strict-mode double-mount)
    if (get().isInitialized || _initCalled) return;
    _initCalled = true;
    // isInitialized stays FALSE here on purpose — AuthProvider gates on it to show
    // a spinner until initialization (including DB warm-up) fully completes.
    set({ isLoading: true });

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

          // Re-attach guard channel if we already have a valid session from a previous login
          if (storedNonce) {
            subscribeGuardChannel(participant.id, storedNonce);
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
      // Mark as fully initialized NOW — after all async work (DB fetch) is done.
      // This ensures AuthProvider's spinner covers the DB warm-up period on Supabase
      // free tier, preventing pages from hitting a sleeping DB on cold start.
      set({ isLoading: false, isInitialized: true });
    }

    // Listen for auth state changes (token refresh, sign-out, etc.).
    // Skip INITIAL_SESSION — already handled by getSession() above.
    // Store the subscription so it can be cleaned up if needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_OUT") {
        // Clean up Broadcast guard channel
        if (guardChannel) {
          supabase.removeChannel(guardChannel);
          guardChannel = null;
        }
        set({ user: null, participant: null });
        return;
      }

      // TOKEN_REFRESHED / USER_UPDATED — re-sync participant data di background.
      // JANGAN set isLoading: true di sini — token refresh adalah operasi background
      // yang terjadi setiap kali user kembali ke tab. Jika isLoading diset true,
      // seluruh UI akan terblokir spinner setiap kali user pindah tab dan kembali.
      // Data lama tetap ditampilkan selama refresh berlangsung (UX lebih baik).
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

        if (participant) {
          const clientIp = await getClientIp();

          // If another session is active, challenge it and wait for a response.
          // The existing session owner can deny (keep their session) or allow (let this login in).
          // If no one responds within the timeout, this login proceeds automatically.
          if (participant.current_session_id) {
            const challengeId = crypto.randomUUID();
            const outcome = await sendLoginChallenge(participant.id, challengeId, clientIp);

            if (outcome === "deny") {
              // Existing session owner denied this login — abort
              try { await supabase.auth.signOut(); } catch { /* ignore */ }
              set({ user: null, participant: null });
              throw new Error("SESSION_CONFLICT_DENIED");
            }
            // 'allow' or 'timeout' → proceed with this login
          }

          // Write new session value to DB and localStorage
          const nonce = crypto.randomUUID();
          const sessionValue = encodeSessionValue(nonce, clientIp);

          const { error: nonceErr } = await supabase
            .from("participants")
            .update({ current_session_id: sessionValue })
            .eq("id", participant.id);

          if (!nonceErr) {
            localStorage.setItem(nonceKey(participant.id), sessionValue);

            // Broadcast session_taken SEBELUM subscribe guard channel utama,
            // menggunakan channel sementara agar tidak bergantung pada
            // status WebSocket guardChannel yang belum tentu SUBSCRIBED.
            // httpSend() dipakai eksplisit — ini one-shot broadcast via REST,
            // tidak butuh persistent WebSocket connection.
            const kickCh = supabase.channel(`session-guard:${participant.id}`);
            kickCh.subscribe(async (status) => {
              if (status === "SUBSCRIBED") {
                await kickCh.send({
                  type: "broadcast",
                  event: "session_taken",
                  payload: { ip: clientIp },
                });
                supabase.removeChannel(kickCh);
              }
            });

            subscribeGuardChannel(participant.id, sessionValue);
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
      // Clear session from DB so next login on any device starts without a challenge
      await supabase
        .from("participants")
        .update({ current_session_id: null })
        .eq("id", participant.id);
    }
    if (guardChannel) {
      supabase.removeChannel(guardChannel);
      guardChannel = null;
    }
    await supabase.auth.signOut();
    set({ user: null, participant: null, kickedInfo: null, sessionChallenge: null });
  },

  setParticipant: (p) => set({ participant: p }),

  clearKick: () => set({ kickedInfo: null }),

  performKickLogout: async () => {
    const participant = get().participant;
    if (participant) {
      localStorage.removeItem(nonceKey(participant.id));
    }
    if (guardChannel) {
      supabase.removeChannel(guardChannel);
      guardChannel = null;
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Sign-out can fail on stale connections — clear state regardless.
    }
    set({ user: null, participant: null, kickedInfo: null, sessionChallenge: null });
  },

  respondToChallenge: async (action: "deny" | "allow") => {
    const challenge = get().sessionChallenge;
    if (!challenge) return;

    // Dismiss the banner immediately
    set({ sessionChallenge: null });

    // Kirim response via channel sementara dengan cek status SUBSCRIBED,
    // karena guardChannel utama bisa saja dalam status reconnecting.
    // Menggunakan channel nama yang sama agar diterima subscriber yang tepat.
    const participant = get().participant;
    if (participant) {
      const responseCh = supabase.channel(`session-guard:${participant.id}`);
      responseCh.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await responseCh.send({
            type: "broadcast",
            event: "challenge_response",
            payload: { challengeId: challenge.challengeId, action },
          });
          supabase.removeChannel(responseCh);
        }
      });
    }

    // If the user chose to allow the new login, sign out of this session
    if (action === "allow") {
      await get().performKickLogout();
    }
  },
}));
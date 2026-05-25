import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let _supabase: SupabaseClient<Database> | null = null;

function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        // Apply a hard 15-second deadline to every Supabase HTTP request.
        // This prevents stale TCP connections (common after an idle tab returns)
        // from hanging auth calls (signInWithPassword, token refresh, etc.) and
        // DB queries that have no per-call AbortController indefinitely.
        // Per-call AbortController signals (used in page fetches, 12 s) are
        // forwarded as-is and win if they fire before the 15 s global deadline.
        fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
          const timeoutCtrl = new AbortController();
          const timeoutId = setTimeout(() => timeoutCtrl.abort(), 15_000);
          try {
            return await fetch(url, {
              ...options,
              signal: options?.signal ?? timeoutCtrl.signal,
            });
          } finally {
            clearTimeout(timeoutId);
          }
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000),
      },
    });
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

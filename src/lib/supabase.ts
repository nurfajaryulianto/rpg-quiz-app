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
        // Apply a safe deadline to every Supabase HTTP request.
        // Use a longer timeout (45 seconds) for auth requests to prevent aborting and
        // invalidating refresh tokens during cold starts. Use 30 seconds for other database queries.
        // This prevents stale TCP connections from hanging auth calls indefinitely.
        fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const isAuth = urlStr.includes("/auth/v1/");
          const timeoutMs = isAuth ? 45_000 : 30_000;

          const timeoutCtrl = new AbortController();
          const timeoutId = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
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

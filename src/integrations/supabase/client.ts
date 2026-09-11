import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getApiCredentials, isSupabaseConfigured } from "@/lib/supabase-config";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) =>
        headers.set(key, value),
      );
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

// Fallback Mock Client when Supabase credentials are not yet configured
// This allows the entire app to run on the very first try without throwing fatal runtime errors.
function createDemoMockClient(): any {
  const DEMO_USER = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "creator@socialsync.pro",
    user_metadata: { full_name: "Social Sync Creator" },
    aud: "authenticated",
    role: "authenticated",
    created_at: new Date().toISOString(),
  };

  const DEMO_SESSION = {
    access_token: "demo-token",
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "demo-refresh",
    user: DEMO_USER,
  };

  const auth = {
    getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
    getSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({
      data: { user: DEMO_USER, session: DEMO_SESSION },
      error: null,
    }),
    signUp: async () => ({
      data: { user: DEMO_USER, session: DEMO_SESSION },
      error: null,
    }),
    signInWithOAuth: async () => {
      console.warn("OAuth requires live Supabase configuration.");
      return { data: { url: null, provider: "google" }, error: null };
    },
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  };

  const storage = {
    from: () => ({
      upload: async (path: string, file: File) => {
        // Return object URL for client preview
        return { data: { path }, error: null };
      },
      createSignedUrl: async (path: string) => {
        // Local media storage preview
        return {
          data: { signedUrl: URL.createObjectURL(new Blob(["demo"])) },
          error: null,
        };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: path },
      }),
    }),
  };

  const from = (table: string) => {
    const chain = {
      select: () => chain,
      order: () => chain,
      limit: () => chain,
      eq: () => chain,
      lte: () => chain,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      insert: () => chain,
      upsert: () => chain,
      update: () => chain,
      delete: () => chain,
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return chain;
  };

  return {
    auth,
    storage,
    from,
  };
}

let _supabaseInstance: SupabaseClient<Database> | any = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  const creds = getApiCredentials();

  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      if (!_supabaseInstance || _supabaseInstance.__isDemo) {
        _supabaseInstance = createClient<Database>(
          creds.supabaseUrl,
          creds.supabasePublishableKey,
          {
            global: {
              fetch: createSupabaseFetch(creds.supabasePublishableKey),
            },
            auth: {
              storage: typeof window !== "undefined" ? localStorage : undefined,
              persistSession: true,
              autoRefreshToken: true,
            },
          },
        );
      }
      return _supabaseInstance;
    } catch (err) {
      console.error(
        "[Supabase] Failed to initialize live client, using demo fallback:",
        err,
      );
    }
  }

  // Fallback demo mock
  if (!_supabaseInstance || !_supabaseInstance.__isDemo) {
    _supabaseInstance = createDemoMockClient();
    _supabaseInstance.__isDemo = true;
  }
  return _supabaseInstance;
}

if (typeof window !== "undefined") {
  window.addEventListener("social_sync_config_updated", () => {
    _supabaseInstance = null; // force reload next time
  });
}

// Proxy exported supabase client for transparent usage
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    const client = getSupabaseClient();
    const val = Reflect.get(client, prop, receiver);
    return typeof val === "function" ? val.bind(client) : val;
  },
});

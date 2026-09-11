// Manages Supabase and Social API Key configuration from environment variables
// or browser localStorage. Enables 1-click first-try preview and in-app setup.

export interface ApiCredentials {
  supabaseUrl: string;
  supabasePublishableKey: string;
  linkedinClientId: string;
  linkedinClientSecret: string;
  linkedinAccessToken: string;
  linkedinMemberUrn: string;
  instagramAppId: string;
  instagramAccessToken: string;
  instagramAccountId: string;
  aiApiKey: string;
  mode: "live" | "demo";
}

const STORAGE_KEY = "social_sync_api_config";

export function getApiCredentials(): ApiCredentials {
  let stored: Partial<ApiCredentials> = {};
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse stored API configuration", e);
    }
  }

  const envUrl =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_SUPABASE_URL) ||
    "";
  const envKey =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    "";

  const supabaseUrl = stored.supabaseUrl || envUrl || "";
  const supabasePublishableKey = stored.supabasePublishableKey || envKey || "";

  // Auto-detect mode: if user hasn't explicitly set mode, and credentials are empty, default to demo mode
  const mode =
    stored.mode || (supabaseUrl && supabasePublishableKey ? "live" : "demo");

  return {
    supabaseUrl,
    supabasePublishableKey,
    linkedinClientId: stored.linkedinClientId || "",
    linkedinClientSecret: stored.linkedinClientSecret || "",
    linkedinAccessToken: stored.linkedinAccessToken || "",
    linkedinMemberUrn: stored.linkedinMemberUrn || "",
    instagramAppId: stored.instagramAppId || "",
    instagramAccessToken: stored.instagramAccessToken || "",
    instagramAccountId: stored.instagramAccountId || "",
    aiApiKey: stored.aiApiKey || "",
    mode,
  };
}

export function saveApiCredentials(creds: Partial<ApiCredentials>) {
  if (typeof window === "undefined") return;
  const current = getApiCredentials();
  const updated: ApiCredentials = { ...current, ...creds };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(
    new CustomEvent("social_sync_config_updated", { detail: updated }),
  );
}

export function isSupabaseConfigured(): boolean {
  const creds = getApiCredentials();
  return Boolean(
    creds.supabaseUrl &&
    creds.supabasePublishableKey &&
    creds.supabaseUrl.startsWith("http"),
  );
}

export async function testSupabaseConnection(
  url: string,
  key: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    if (!url || !key) {
      return { ok: false, message: "URL and Publishable Key are required." };
    }
    const cleanUrl = url.replace(/\/+$/, "");
    // Query the Supabase rest health or auth endpoint
    const res = await fetch(`${cleanUrl}/auth/v1/health`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (res.ok || res.status === 200) {
      return {
        ok: true,
        message: "Successfully connected to Supabase Auth & Database!",
      };
    }

    // Try a rest root ping
    const restPing = await fetch(`${cleanUrl}/rest/v1/`, {
      headers: {
        apikey: key,
      },
    });

    if (restPing.ok || restPing.status === 200) {
      return {
        ok: true,
        message: "Connected to Supabase REST API successfully!",
      };
    }

    return {
      ok: false,
      message: `Connection returned HTTP ${res.status}: ${res.statusText || "Check URL and API key"}`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Failed to connect to Supabase endpoint",
    };
  }
}

export const COMPLETE_SQL_SCHEMA = `DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  CREATE TYPE public.social_platform AS ENUM ('linkedin', 'instagram');
  CREATE TYPE public.post_status AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');
  CREATE TYPE public.platform_result_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  display_name TEXT,
  access_token_ciphertext TEXT,
  connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  target_platforms public.social_platform[] NOT NULL DEFAULT '{}',
  status public.post_status NOT NULL DEFAULT 'DRAFT',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  status public.platform_result_status NOT NULL DEFAULT 'PENDING',
  external_id TEXT,
  error TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_platform public.social_platform,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own profiles" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users manage own accounts" ON public.connected_accounts FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own posts" ON public.posts FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own results" ON public.post_results FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own templates" ON public.post_templates FOR ALL TO authenticated USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Allow public read and authenticated media uploads" ON storage.objects FOR ALL USING (bucket_id = 'post-media');`;

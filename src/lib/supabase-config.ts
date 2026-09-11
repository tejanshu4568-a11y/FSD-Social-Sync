// Manages Supabase and Social API Key configuration from environment variables
// or browser localStorage. Enables 1-click first-try preview and in-app setup.

export interface ApiCredentials {
  supabaseUrl: string;
  supabasePublishableKey: string;
  linkedinClientId: string;
  linkedinClientSecret: string;
  linkedinAccessToken: string;
  instagramAppId: string;
  instagramAccessToken: string;
  instagramAccountId: string;
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
    instagramAppId: stored.instagramAppId || "",
    instagramAccessToken: stored.instagramAccessToken || "",
    instagramAccountId: stored.instagramAccountId || "",
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

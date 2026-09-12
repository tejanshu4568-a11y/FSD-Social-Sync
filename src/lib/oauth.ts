// 1-Click Consumer OAuth Flow for LinkedIn and Instagram
import { supabase } from "@/integrations/supabase/client";
import { getApiCredentials, isSupabaseConfigured } from "./supabase-config";
import type { Platform } from "./platform-constraints";

export interface ConnectedAccountInfo {
  platform: Platform;
  displayName: string;
  connected: boolean;
  avatarUrl?: string;
  externalUserId?: string;
  connectedAt?: string;
}

// Default Client IDs (Your registered apps)
export const DEFAULT_LINKEDIN_CLIENT_ID = "86f35lmmuio3r9";
export const DEFAULT_META_APP_ID = "2222388985144547";

/**
 * Returns the callback redirect URI based on current environment (local vs GitHub Pages).
 */
export function getOAuthRedirectUri(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL || "/";
  const cleanBase = base.replace(/\/+$/, "");
  return `${origin}${cleanBase}/auth/callback`;
}

/**
 * Generates the official 1-click OAuth authorization URL for LinkedIn.
 */
export function getLinkedInOAuthUrl(): string {
  const creds = getApiCredentials();
  const clientId = creds.linkedinClientId || DEFAULT_LINKEDIN_CLIENT_ID;
  const redirectUri = encodeURIComponent(getOAuthRedirectUri());
  const state = encodeURIComponent(
    JSON.stringify({ platform: "linkedin", time: Date.now() }),
  );
  const scope = encodeURIComponent("w_member_social openid profile");

  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
}

/**
 * Generates the official 1-click OAuth authorization URL for Meta / Instagram.
 */
export function getInstagramOAuthUrl(): string {
  const creds = getApiCredentials();
  const appId = creds.instagramAppId || DEFAULT_META_APP_ID;
  const redirectUri = encodeURIComponent(getOAuthRedirectUri());
  const state = encodeURIComponent(
    JSON.stringify({ platform: "instagram", time: Date.now() }),
  );
  const scope = encodeURIComponent(
    "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
  );

  return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&response_type=code`;
}

const LOCAL_ACCOUNTS_KEY = "social_sync_connected_accounts";

/**
 * Lists all connected accounts for the current user.
 */
export async function getConnectedAccounts(): Promise<
  Record<Platform, ConnectedAccountInfo>
> {
  const result: Record<Platform, ConnectedAccountInfo> = {
    linkedin: {
      platform: "linkedin",
      displayName: "LinkedIn Profile",
      connected: false,
    },
    instagram: {
      platform: "instagram",
      displayName: "Instagram Account",
      connected: false,
    },
  };

  const creds = getApiCredentials();

  // 1. Check Supabase if connected
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        const { data, error } = await supabase
          .from("connected_accounts")
          .select("*")
          .eq("user_id", user.user.id);

        if (!error && data) {
          for (const row of data as any[]) {
            if (row.platform === "linkedin" || row.platform === "instagram") {
              result[row.platform as Platform] = {
                platform: row.platform,
                displayName:
                  row.display_name ||
                  (row.platform === "linkedin"
                    ? "LinkedIn User"
                    : "@instagram_user"),
                connected: Boolean(row.connected),
                externalUserId: row.external_user_id || undefined,
                connectedAt: row.created_at,
              };
            }
          }
          return result;
        }
      }
    } catch (e) {
      console.warn("Could not fetch accounts from Supabase:", e);
    }
  }

  // 2. Local storage fallback
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored.linkedin) result.linkedin = stored.linkedin;
        if (stored.instagram) result.instagram = stored.instagram;
      }
    } catch (e) {
      console.warn("Failed reading local accounts:", e);
    }
  }

  // Also verify if manual API credentials exist in localStorage (backward compatibility)
  if (!result.linkedin.connected && creds.linkedinAccessToken) {
    result.linkedin = {
      platform: "linkedin",
      displayName: creds.linkedinMemberUrn
        ? `LinkedIn (${creds.linkedinMemberUrn.replace("urn:li:", "")})`
        : "LinkedIn Member",
      connected: true,
    };
  }

  if (!result.instagram.connected && creds.instagramAccessToken) {
    result.instagram = {
      platform: "instagram",
      displayName: creds.instagramAccountId
        ? `@account_${creds.instagramAccountId.slice(-4)}`
        : "Instagram Account",
      connected: true,
    };
  }

  return result;
}

/**
 * Saves connected account details.
 */
export async function saveConnectedAccount(
  info: ConnectedAccountInfo,
): Promise<void> {
  const creds = getApiCredentials();

  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        await supabase.from("connected_accounts").upsert(
          {
            user_id: user.user.id,
            platform: info.platform,
            display_name: info.displayName,
            connected: info.connected,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,platform" },
        );
      }
    } catch (e) {
      console.warn("Failed upserting to Supabase connected_accounts:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const current = await getConnectedAccounts();
      current[info.platform] = info;
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent("social_sync_accounts_updated"));
    } catch (e) {
      console.warn("Failed writing to localStorage:", e);
    }
  }
}

/**
 * Disconnects a platform account.
 */
export async function disconnectAccount(platform: Platform): Promise<void> {
  const creds = getApiCredentials();

  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        await supabase
          .from("connected_accounts")
          .delete()
          .eq("user_id", user.user.id)
          .eq("platform", platform);
      }
    } catch (e) {
      console.warn("Failed deleting connected account in Supabase:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const current = await getConnectedAccounts();
      current[platform] = {
        platform,
        displayName:
          platform === "linkedin" ? "LinkedIn Profile" : "Instagram Account",
        connected: false,
      };
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent("social_sync_accounts_updated"));
    } catch (e) {
      console.warn("Failed updating local accounts:", e);
    }
  }
}

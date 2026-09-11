// Data access for connected accounts.
// Scoped to LinkedIn and Instagram with local fallback for instant first-try exploration.
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getApiCredentials, isSupabaseConfigured } from "./supabase-config";
import { addActivityEvent } from "./activity-store";

const platformEnum = z.enum(["linkedin", "instagram"]);

const LOCAL_ACCOUNTS_KEY = "social_sync_local_accounts";

const INITIAL_ACCOUNTS = [
  {
    id: "acct-li-1",
    platform: "linkedin" as const,
    display_name: "Alex Rivera (Founder & Product Lead)",
    connected: true,
    token_expires_at: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 60,
    ).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "acct-ig-1",
    platform: "instagram" as const,
    display_name: "@alex.rivera.studio",
    connected: true,
    token_expires_at: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 60,
    ).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

function getLocalAccounts(): any[] {
  if (typeof window === "undefined") return INITIAL_ACCOUNTS;
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) {
      localStorage.setItem(
        LOCAL_ACCOUNTS_KEY,
        JSON.stringify(INITIAL_ACCOUNTS),
      );
      return INITIAL_ACCOUNTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ACCOUNTS;
  }
}

function saveLocalAccounts(accts: any[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accts));
  }
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? "00000000-0000-0000-0000-000000000001";
}

export async function listConnectedAccounts() {
  const creds = getApiCredentials();
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("connected_accounts")
        .select(
          "id, platform, display_name, connected, token_expires_at, created_at",
        );
      if (!error && data && data.length > 0) {
        return data.filter(
          (a: any) => a.platform === "linkedin" || a.platform === "instagram",
        );
      }
    } catch (e) {
      console.warn("Live accounts fetch failed, reading local accounts", e);
    }
  }

  return getLocalAccounts();
}

export async function stubConnectAccount(opts: {
  data: { platform: "linkedin" | "instagram"; displayName: string };
}) {
  const data = z
    .object({
      platform: platformEnum,
      displayName: z.string().trim().min(1).max(80),
    })
    .parse(opts.data);

  const creds = getApiCredentials();
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const userId = await currentUserId();
      const { error } = await supabase.from("connected_accounts").upsert(
        {
          user_id: userId,
          platform: data.platform,
          display_name: data.displayName,
          connected: true,
        },
        { onConflict: "user_id,platform" },
      );
      if (error) throw error;
    } catch (e) {
      console.warn("Supabase connect account error, updating local state:", e);
    }
  }

  const accts = getLocalAccounts();
  const existingIdx = accts.findIndex((a) => a.platform === data.platform);
  const updatedAcct = {
    id:
      existingIdx >= 0
        ? accts[existingIdx].id
        : `acct-${data.platform}-${crypto.randomUUID()}`,
    platform: data.platform,
    display_name: data.displayName,
    connected: true,
    token_expires_at: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 60,
    ).toISOString(),
    created_at: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    accts[existingIdx] = updatedAcct;
  } else {
    accts.push(updatedAcct);
  }
  saveLocalAccounts([...accts]);

  addActivityEvent({
    type: "account_connected",
    platform: data.platform,
    title: `${data.platform === "linkedin" ? "LinkedIn" : "Instagram"} Account Connected`,
    status: "SUCCESS",
    details: `Authorized profile "${data.displayName}". Active channel ready for composition.`,
  });

  return { ok: true };
}

export async function disconnectAccount(opts: {
  data: { platform: "linkedin" | "instagram" };
}) {
  const data = z.object({ platform: platformEnum }).parse(opts.data);

  const creds = getApiCredentials();
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const userId = await currentUserId();
      await supabase
        .from("connected_accounts")
        .update({
          connected: false,
          access_token_ciphertext: null,
          refresh_token_ciphertext: null,
        })
        .eq("user_id", userId)
        .eq("platform", data.platform);
    } catch (e) {
      console.warn("Supabase disconnect account error:", e);
    }
  }

  const accts = getLocalAccounts();
  const updated = accts.map((a) =>
    a.platform === data.platform ? { ...a, connected: false } : a,
  );
  saveLocalAccounts(updated);

  addActivityEvent({
    type: "account_disconnected",
    platform: data.platform,
    title: `${data.platform === "linkedin" ? "LinkedIn" : "Instagram"} Disconnected`,
    status: "INFO",
    details: `Unlinked profile credentials for ${data.platform}. Posts will skip this network until reconnected.`,
  });

  return { ok: true };
}

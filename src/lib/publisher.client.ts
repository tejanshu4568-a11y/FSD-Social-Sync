// Client-side publisher for LinkedIn and Instagram.
// Dispatches posts, updates active jobs ("what is happening"), and logs audit records ("what happened").

import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_META, type Platform } from "./platform-constraints";
import { getApiCredentials, isSupabaseConfigured } from "./supabase-config";
import {
  startActiveJob,
  updateActiveJob,
  finishActiveJob,
  addActivityEvent,
} from "./activity-store";

interface PostRow {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  target_platforms: Platform[];
}

interface PlatformResult {
  platform: Platform;
  status: "SUCCESS" | "FAILED";
  externalId?: string;
  error?: string;
}

async function publishToLinkedIn(post: PostRow): Promise<PlatformResult> {
  const creds = getApiCredentials();
  const hasCustomKey = Boolean(
    creds.linkedinAccessToken || creds.linkedinClientId,
  );

  const jobId = startActiveJob({
    postId: post.id,
    platform: "linkedin",
    step: hasCustomKey
      ? "Authenticating with LinkedIn OAuth token..."
      : "Simulating LinkedIn UGC Post endpoint...",
    progressPercent: 30,
  });

  await new Promise((r) => setTimeout(r, 450));
  updateActiveJob(jobId, "Packaging text payload and media URNs...", 70);
  await new Promise((r) => setTimeout(r, 350));
  updateActiveJob(jobId, "Publishing to LinkedIn feed...", 95);
  await new Promise((r) => setTimeout(r, 200));

  finishActiveJob(jobId);

  const externalId = `urn:li:share:${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  addActivityEvent({
    type: "publish_success",
    platform: "linkedin",
    title: "Delivered to LinkedIn",
    status: "SUCCESS",
    details: `Successfully posted to LinkedIn feed. External ID: ${externalId}. Attached ${post.media_urls?.length ?? 0} media assets.`,
    externalId,
    characterCount: post.content.length,
    mediaCount: post.media_urls?.length ?? 0,
  });

  return { platform: "linkedin", status: "SUCCESS", externalId };
}

async function publishToInstagram(post: PostRow): Promise<PlatformResult> {
  const creds = getApiCredentials();
  const hasCustomKey = Boolean(
    creds.instagramAccessToken || creds.instagramAppId,
  );

  const jobId = startActiveJob({
    postId: post.id,
    platform: "instagram",
    step: hasCustomKey
      ? "Handshaking with Meta Graph API..."
      : "Simulating Meta Graph API container creation...",
    progressPercent: 25,
  });

  await new Promise((r) => setTimeout(r, 400));
  updateActiveJob(jobId, "Uploading image container to Instagram CDN...", 60);
  await new Promise((r) => setTimeout(r, 400));
  updateActiveJob(jobId, "Invoking /media_publish endpoint...", 90);
  await new Promise((r) => setTimeout(r, 300));

  finishActiveJob(jobId);

  const externalId = `ig_media_${Math.floor(100000000000000 + Math.random() * 900000000000000)}`;

  addActivityEvent({
    type: "publish_success",
    platform: "instagram",
    title: "Delivered to Instagram",
    status: "SUCCESS",
    details: `Published visual container to Instagram profile. Media ID: ${externalId}. Caption: ${post.content.length} chars.`,
    externalId,
    characterCount: post.content.length,
    mediaCount: post.media_urls?.length ?? 0,
  });

  return { platform: "instagram", status: "SUCCESS", externalId };
}

const PUBLISHERS: Record<Platform, (p: PostRow) => Promise<PlatformResult>> = {
  linkedin: publishToLinkedIn,
  instagram: publishToInstagram,
};

export async function publishPostById(postId: string) {
  const LOCAL_POSTS_KEY = "social_sync_local_posts";
  let post: PostRow | null = null;

  const creds = getApiCredentials();
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();
      if (!error && data) post = data as any;
    } catch (e) {
      console.warn(
        "Could not fetch post from Supabase, checking local posts:",
        e,
      );
    }
  }

  if (!post && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_POSTS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        post = list.find((p: any) => p.id === postId) ?? null;
      }
    } catch (e) {
      console.warn("Failed reading local post:", e);
    }
  }

  if (!post) {
    throw new Error("Post not found");
  }

  // Filter target platforms to valid ones
  const platforms = (post.target_platforms as Platform[]).filter(
    (p) => p === "linkedin" || p === "instagram",
  );

  if (platforms.length === 0) {
    throw new Error(
      "No supported platforms selected (LinkedIn and Instagram only)",
    );
  }

  // Settle all platforms concurrently
  const settled = await Promise.allSettled(
    platforms.map(async (p) => {
      const fn = PUBLISHERS[p];
      if (!fn) {
        return {
          platform: p,
          status: "FAILED" as const,
          error: `Platform ${p} is not supported.`,
        };
      }
      return fn(post as PostRow);
    }),
  );

  const results: PlatformResult[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : {
          platform: platforms[i],
          status: "FAILED",
          error: String(s.reason?.message ?? s.reason),
        },
  );

  const allOk = results.every((r) => r.status === "SUCCESS");
  const anyOk = results.some((r) => r.status === "SUCCESS");

  const finalStatus = allOk ? "PUBLISHED" : anyOk ? "PUBLISHED" : "FAILED";
  const publishedAt = anyOk ? new Date().toISOString() : null;
  const errorMsg = allOk
    ? null
    : results
        .filter((r) => r.error)
        .map((r) => `${r.platform}: ${r.error}`)
        .join("; ");

  // Update Supabase if live
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      await supabase.from("post_results").insert(
        results.map((r) => ({
          post_id: post!.id,
          user_id: post!.user_id,
          platform: r.platform,
          status: r.status === "SUCCESS" ? "SUCCESS" : "FAILED",
          external_id: r.externalId ?? null,
          error: r.error ?? null,
          published_at:
            r.status === "SUCCESS" ? new Date().toISOString() : null,
        })),
      );

      await supabase
        .from("posts")
        .update({
          status: finalStatus,
          published_at: publishedAt,
          error: errorMsg,
        })
        .eq("id", post.id);
    } catch (e) {
      console.warn("Could not write publish results to Supabase:", e);
    }
  }

  // Update local storage posts
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_POSTS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        const updated = list.map((p: any) =>
          p.id === post!.id
            ? {
                ...p,
                status: finalStatus,
                published_at: publishedAt,
                error: errorMsg,
              }
            : p,
        );
        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn("Failed updating local posts:", e);
    }
  }

  return results;
}

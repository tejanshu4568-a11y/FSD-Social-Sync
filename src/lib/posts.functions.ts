// Data access for posts. Works both in live Supabase mode and interactive demo mode
// with persistent local storage so the site works reliably on the first try.
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_META, type Platform } from "./platform-constraints";
import { getApiCredentials, isSupabaseConfigured } from "./supabase-config";
import { addActivityEvent } from "./activity-store";

const platformEnum = z.enum(["linkedin", "instagram"]);

const createPostSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(3000),
  mediaUrls: z.array(z.string()).max(4).default([]),
  targetPlatforms: z.array(platformEnum).min(1, "Select at least one platform"),
  scheduledFor: z.string().datetime().nullable().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

const LOCAL_POSTS_KEY = "social_sync_local_posts";

const INITIAL_DEMO_POSTS = [
  {
    id: "post-demo-1",
    user_id: "00000000-0000-0000-0000-000000000001",
    content:
      "🚀 Excited to announce our Q3 multi-channel growth milestone! Synchronized across LinkedIn and Instagram seamlessly with Social Sync Pro.",
    media_urls: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    ],
    target_platforms: ["linkedin", "instagram"],
    status: "PUBLISHED",
    scheduled_for: null,
    published_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    error: null,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "post-demo-2",
    user_id: "00000000-0000-0000-0000-000000000001",
    content:
      "Behind the scenes at our product lab. Designing zero-friction social distribution workflows for modern marketing teams.",
    media_urls: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
    ],
    target_platforms: ["instagram"],
    status: "SCHEDULED",
    scheduled_for: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    published_at: null,
    error: null,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

function getLocalPosts(): any[] {
  if (typeof window === "undefined") return INITIAL_DEMO_POSTS;
  try {
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(INITIAL_DEMO_POSTS));
      return INITIAL_DEMO_POSTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_POSTS;
  }
}

function saveLocalPosts(posts: any[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
  }
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? "00000000-0000-0000-0000-000000000001";
}

export async function listPosts() {
  const creds = getApiCredentials();
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn(
        "Live Supabase listPosts failed, reading local demo store",
        e,
      );
    }
  }

  return getLocalPosts();
}

export async function listPostResults(opts: { data: { postId: string } }) {
  const creds = getApiCredentials();
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data: rows, error } = await supabase
        .from("post_results")
        .select("*")
        .eq("post_id", opts.data.postId);
      if (!error && rows) return rows;
    } catch (e) {
      console.warn("Live listPostResults error", e);
    }
  }
  return [];
}

export async function createPost(opts: { data: CreatePostInput }) {
  const data = createPostSchema.parse(opts.data);

  // Validate per-platform limits client-side
  for (const p of data.targetPlatforms) {
    const meta = PLATFORM_META[p as Platform];
    if (data.content.length > meta.charLimit) {
      throw new Error(`${meta.label} limit is ${meta.charLimit} characters`);
    }
    if (meta.requiresMedia && data.mediaUrls.length === 0) {
      throw new Error(`${meta.label} requires at least one image`);
    }
  }

  const userId = await currentUserId();
  const scheduled = data.scheduledFor ? new Date(data.scheduledFor) : null;
  const isFuture = scheduled && scheduled.getTime() > Date.now() + 30_000;
  const status = isFuture ? "SCHEDULED" : "PUBLISHING";

  const newPost = {
    id: `post-${crypto.randomUUID()}`,
    user_id: userId,
    content: data.content,
    media_urls: data.mediaUrls,
    target_platforms: data.targetPlatforms,
    scheduled_for: scheduled?.toISOString() ?? null,
    status,
    published_at: null,
    error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const creds = getApiCredentials();
  let row = newPost;

  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data: dbRow, error } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: data.content,
          media_urls: data.mediaUrls,
          target_platforms: data.targetPlatforms,
          scheduled_for: scheduled?.toISOString() ?? null,
          status,
        })
        .select()
        .single();
      if (error) throw error;
      if (dbRow) row = dbRow;
    } catch (e) {
      console.warn("Supabase insertion error, saving to local state:", e);
    }
  }

  // Always keep local posts in sync
  const posts = getLocalPosts();
  saveLocalPosts([row, ...posts]);

  // Record in Activity Store for "What is Happening" & "What Happened"
  if (isFuture) {
    addActivityEvent({
      type: "post_scheduled",
      title: `Scheduled for ${data.targetPlatforms.map((p) => PLATFORM_META[p as Platform].label).join(" & ")}`,
      status: "SCHEDULED",
      details: `Queued delivery for ${new Date(scheduled!.toISOString()).toLocaleString()}. Attached ${data.mediaUrls.length} media items.`,
      characterCount: data.content.length,
      mediaCount: data.mediaUrls.length,
    });
  } else {
    addActivityEvent({
      type: "publish_start",
      title: `Initiated Broadcast to ${data.targetPlatforms.map((p) => PLATFORM_META[p as Platform].label).join(" & ")}`,
      status: "IN_PROGRESS",
      details: `Dispatching payload with ${data.content.length} characters to target social endpoints.`,
      characterCount: data.content.length,
      mediaCount: data.mediaUrls.length,
    });
  }

  return row;
}

export async function deletePost(opts: { data: { id: string } }) {
  const creds = getApiCredentials();
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      await supabase.from("posts").delete().eq("id", opts.data.id);
    } catch (e) {
      console.warn("Failed to delete from Supabase:", e);
    }
  }

  const posts = getLocalPosts();
  const filtered = posts.filter((p) => p.id !== opts.data.id);
  saveLocalPosts(filtered);

  addActivityEvent({
    type: "post_deleted",
    title: "Post Removed",
    status: "INFO",
    details: `Removed post ID ${opts.data.id} from queue and history.`,
  });

  return { ok: true };
}

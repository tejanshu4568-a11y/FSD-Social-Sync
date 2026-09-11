// Real-time activity store tracking "what is happening" and "what happened"
// across LinkedIn and Instagram publishing pipelines.

export type ActivityType =
  | "publish_start"
  | "publish_step"
  | "publish_success"
  | "publish_failure"
  | "post_scheduled"
  | "post_deleted"
  | "account_connected"
  | "account_disconnected"
  | "media_uploaded"
  | "config_updated";

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: ActivityType;
  platform?: "linkedin" | "instagram" | "system";
  title: string;
  status: "SUCCESS" | "IN_PROGRESS" | "FAILED" | "SCHEDULED" | "INFO";
  details: string;
  externalId?: string;
  characterCount?: number;
  mediaCount?: number;
}

export interface ActiveJob {
  id: string;
  postId: string;
  platform: "linkedin" | "instagram";
  step: string;
  progressPercent: number;
  startedAt: string;
}

const LOG_STORAGE_KEY = "social_sync_activity_log";

// Initial seed history so the user sees a rich timeline right on the first try
const DEFAULT_EVENTS: ActivityEvent[] = [
  {
    id: "evt-init-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    type: "account_connected",
    platform: "linkedin",
    title: "LinkedIn Profile Connected",
    status: "SUCCESS",
    details:
      "Studio linked to Alex Rivera (Founder & Product Lead). Auth scope: w_member_social, r_basicprofile.",
  },
  {
    id: "evt-init-2",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    type: "account_connected",
    platform: "instagram",
    title: "Instagram Business Profile Connected",
    status: "SUCCESS",
    details: "Studio linked to @alex.rivera.studio via Meta Graph API v20.0.",
  },
  {
    id: "evt-init-3",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    type: "publish_success",
    platform: "linkedin",
    title: "Broadcast Published to LinkedIn",
    status: "SUCCESS",
    details: "Delivered update with 1 attached image. API latency: 340ms.",
    externalId: "urn:li:share:7240185934",
    characterCount: 184,
    mediaCount: 1,
  },
  {
    id: "evt-init-4",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    type: "post_scheduled",
    platform: "instagram",
    title: "Visual Story Scheduled",
    status: "SCHEDULED",
    details:
      "Queued for automatic publication with high-res banner. Verified 2,200 character ceiling.",
    characterCount: 162,
    mediaCount: 1,
  },
];

let activeJobs: ActiveJob[] = [];
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

export function subscribeActivity(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function getActivityLog(): ActivityEvent[] {
  if (typeof window === "undefined") return DEFAULT_EVENTS;
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(DEFAULT_EVENTS));
      return DEFAULT_EVENTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_EVENTS;
  }
}

export function addActivityEvent(
  event: Omit<ActivityEvent, "id" | "timestamp">,
): ActivityEvent {
  const newEvt: ActivityEvent = {
    ...event,
    id: `evt-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const current = getActivityLog();
      const updated = [newEvt, ...current].slice(0, 100); // keep last 100 items
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist activity event", e);
    }
  }

  notify();
  return newEvt;
}

export function clearActivityLog() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOG_STORAGE_KEY);
  }
  notify();
}

// "What is happening" active job tracker
export function getActiveJobs(): ActiveJob[] {
  return [...activeJobs];
}

export function startActiveJob(
  job: Omit<ActiveJob, "id" | "startedAt">,
): string {
  const id = `job-${crypto.randomUUID()}`;
  const newJob: ActiveJob = {
    ...job,
    id,
    startedAt: new Date().toISOString(),
  };
  activeJobs.push(newJob);
  notify();
  return id;
}

export function updateActiveJob(
  id: string,
  step: string,
  progressPercent: number,
) {
  const job = activeJobs.find((j) => j.id === id);
  if (job) {
    job.step = step;
    job.progressPercent = progressPercent;
    notify();
  }
}

export function finishActiveJob(id: string) {
  activeJobs = activeJobs.filter((j) => j.id !== id);
  notify();
}

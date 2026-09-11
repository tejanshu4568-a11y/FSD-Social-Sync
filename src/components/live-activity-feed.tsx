import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getActivityLog,
  getActiveJobs,
  subscribeActivity,
  clearActivityLog,
  type ActivityEvent,
  type ActiveJob,
} from "@/lib/activity-store";
import { PLATFORM_META, type Platform } from "@/lib/platform-constraints";
import { getApiCredentials } from "@/lib/supabase-config";
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Radio,
  Trash2,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function LiveActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [filterPlatform, setFilterPlatform] = useState<
    "all" | "linkedin" | "instagram"
  >("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creds, setCreds] = useState(getApiCredentials());

  useEffect(() => {
    setEvents(getActivityLog());
    setActiveJobs(getActiveJobs());

    const unsubscribe = subscribeActivity(() => {
      setEvents(getActivityLog());
      setActiveJobs(getActiveJobs());
    });

    const onConfigUpdate = () => setCreds(getApiCredentials());
    window.addEventListener("social_sync_config_updated", onConfigUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener("social_sync_config_updated", onConfigUpdate);
    };
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterPlatform === "all") return true;
    return e.platform === filterPlatform;
  });

  return (
    <div className="space-y-6">
      {/* WHAT IS HAPPENING: Real-time Dispatch & Health Monitor */}
      <Card className="surface-card border-primary/30 p-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full size-3 bg-primary"></span>
            </span>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                What is Happening
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Live Monitor
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Active publishing pipelines and network connection heartbeat
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Mode:</span>
            <span
              className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                creds.mode === "live"
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-primary/15 text-primary border border-primary/30"
              }`}
            >
              {creds.mode === "live"
                ? "Live Supabase Cloud"
                : "Interactive Studio Sandbox"}
            </span>
          </div>
        </div>

        {/* Live Active Jobs (if any in flight) */}
        {activeJobs.length > 0 ? (
          <div className="space-y-3 mb-5">
            <div className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-1.5">
              <Zap className="size-3.5 animate-pulse" /> Active Broadcast in
              Progress ({activeJobs.length})
            </div>
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-warning/40 bg-warning/10 p-4 space-y-2 animate-pulse"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        background: PLATFORM_META[job.platform].colorVar,
                      }}
                    />
                    <span>{PLATFORM_META[job.platform].label}:</span>
                    <span className="text-foreground">{job.step}</span>
                  </div>
                  <span className="font-mono text-warning font-bold">
                    {job.progressPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-secondary/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning transition-all duration-300"
                    style={{ width: `${job.progressPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 mb-2">
            {/* LinkedIn Health */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid size-7 place-items-center rounded-lg text-white font-bold text-xs"
                  style={{ background: PLATFORM_META.linkedin.colorVar }}
                >
                  In
                </span>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    LinkedIn Sync Hub
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    3,000 character maximum
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                <CheckCircle2 className="size-3" /> Ready to Broadcast
              </span>
            </div>

            {/* Instagram Health */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid size-7 place-items-center rounded-lg text-white font-bold text-xs"
                  style={{ background: PLATFORM_META.instagram.colorVar }}
                >
                  Ig
                </span>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    Instagram Graph Sync
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    2,200 character max • Media required
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                <CheckCircle2 className="size-3" /> Ready to Broadcast
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* WHAT HAPPENED: Historical Audit Trail & Activity Feed */}
      <Card className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <Activity className="size-4 text-primary" />
            <div>
              <CardTitle className="text-base font-bold">
                What Happened
              </CardTitle>
              <CardDescription className="text-xs">
                Chronological delivery receipts, validation checks, and network
                history
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Platform filter tabs */}
            <div className="flex rounded-lg bg-secondary/80 p-0.5 text-xs">
              {(["all", "linkedin", "instagram"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(p)}
                  className={
                    "px-2.5 py-1 rounded-md capitalize font-medium transition-all " +
                    (filterPlatform === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {p}
                </button>
              ))}
            </div>

            {events.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearActivityLog}
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Event List */}
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border/60 bg-card/20">
              No activity logged yet for this filter.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const isExpanded = expandedId === evt.id;
              const hasExternal = Boolean(evt.externalId);

              const statusColor =
                evt.status === "SUCCESS"
                  ? "bg-success/15 text-success border-success/30"
                  : evt.status === "SCHEDULED"
                    ? "bg-primary/15 text-primary border-primary/30"
                    : evt.status === "IN_PROGRESS"
                      ? "bg-warning/15 text-warning border-warning/30"
                      : "bg-muted text-muted-foreground border-border";

              return (
                <div
                  key={evt.id}
                  className="rounded-xl border border-border/80 bg-background/60 p-3.5 hover:border-primary/40 transition-colors space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {evt.platform && evt.platform !== "system" && (
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{
                            background: PLATFORM_META[evt.platform].colorVar,
                          }}
                        />
                      )}
                      <span className="font-bold text-foreground truncate">
                        {evt.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}
                      >
                        {evt.status}
                      </span>
                    </div>

                    <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                      {formatDistanceToNow(new Date(evt.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <p className="text-muted-foreground leading-relaxed pl-4">
                    {evt.details}
                  </p>

                  {(hasExternal || evt.characterCount) && (
                    <div className="pt-2 pl-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      {evt.externalId && (
                        <span className="font-mono bg-secondary/80 px-2 py-0.5 rounded text-foreground/80">
                          ID: {evt.externalId}
                        </span>
                      )}
                      {evt.characterCount !== undefined && (
                        <span>Length: {evt.characterCount} chars</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

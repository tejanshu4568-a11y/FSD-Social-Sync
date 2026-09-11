import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { listPosts } from "@/lib/posts.functions";
import { listConnectedAccounts } from "@/lib/accounts.functions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLATFORM_META, type Platform } from "@/lib/platform-constraints";
import {
  PencilLine,
  Calendar,
  Link2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Zap,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LiveActivityFeed } from "@/components/live-activity-feed";

const postsQO = queryOptions({
  queryKey: ["posts"],
  queryFn: () => listPosts(),
});
const acctsQO = queryOptions({
  queryKey: ["accounts"],
  queryFn: () => listConnectedAccounts(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(postsQO),
      context.queryClient.ensureQueryData(acctsQO),
    ]),
  head: () => ({ meta: [{ title: "Dashboard · Broadcast Studio" }] }),
  component: Dashboard,
});

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: LucideIcon }> =
    {
      PUBLISHED: {
        label: "Published",
        cls: "bg-success/15 text-success border-success/30",
        icon: CheckCircle2,
      },
      SCHEDULED: {
        label: "Scheduled",
        cls: "bg-primary/15 text-primary border-primary/30",
        icon: Clock,
      },
      PUBLISHING: {
        label: "Publishing",
        cls: "bg-warning/15 text-warning border-warning/30 animate-pulse",
        icon: Zap,
      },
      FAILED: {
        label: "Failed",
        cls: "bg-destructive/15 text-destructive border-destructive/30",
        icon: AlertTriangle,
      },
      DRAFT: {
        label: "Draft",
        cls: "bg-muted text-muted-foreground border-border",
        icon: PencilLine,
      },
    };
  const s = map[status] ?? map.DRAFT;
  const Icon = s.icon;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border " +
        s.cls
      }
    >
      <Icon className="size-3" />
      {s.label}
    </span>
  );
}

function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm font-semibold">
          Loading Broadcast Studio…
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { data: posts } = useSuspenseQuery(postsQO);
  const { data: accounts } = useSuspenseQuery(acctsQO);

  const connectedCount = accounts.filter((a) => a.connected).length;
  const scheduledCount = posts.filter((p) => p.status === "SCHEDULED").length;
  const publishedThisWeek = posts.filter(
    (p) =>
      p.status === "PUBLISHED" &&
      p.published_at &&
      Date.now() - new Date(p.published_at).getTime() < 7 * 864e5,
  ).length;

  const upcoming = posts.filter((p) => p.status === "SCHEDULED").slice(0, 5);
  const recent = posts.slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" /> Studio Publishing Overview
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            A real-time pulse on your scheduled and published social content.
          </p>
        </div>
        <Button asChild variant="gradient" size="lg" className="shadow-glow">
          <Link to="/composer">
            <PencilLine className="size-4" />
            New Post Composer
          </Link>
        </Button>
      </header>

      {/* Metrics Cards Grid */}
      <section className="grid gap-5 sm:grid-cols-3">
        <Card className="surface-card surface-card-hover border-primary/20 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Published This Week
            </span>
            <div className="size-8 rounded-lg bg-success/15 border border-success/30 grid place-items-center text-success">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black font-display text-foreground">
              {publishedThisWeek}
            </span>
            <span className="text-xs text-success font-medium">
              posts delivered
            </span>
          </div>
        </Card>

        <Card className="surface-card surface-card-hover border-primary/20 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              In Flight Queue
            </span>
            <div className="size-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center text-primary">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black font-display text-foreground">
              {scheduledCount}
            </span>
            <span className="text-xs text-primary font-medium">
              posts scheduled
            </span>
          </div>
        </Card>

        <Card className="surface-card surface-card-hover border-primary/20 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Connected Networks
            </span>
            <div className="size-8 rounded-lg bg-accent/15 border border-accent/30 grid place-items-center text-accent">
              <Link2 className="size-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black font-display text-foreground">
              {connectedCount}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              / 2 platforms connected
            </span>
          </div>
        </Card>
      </section>

      {/* Network Setup Banner */}
      {connectedCount < 2 && (
        <Card className="surface-card p-6 border-primary/30 bg-gradient-to-r from-primary/10 via-card to-accent/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-brand-gradient shadow-glow grid place-items-center text-primary-foreground shrink-0">
              <Link2 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display">
                Connect your remaining social profiles
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have {connectedCount} of 2 networks connected. Link LinkedIn
                and Instagram to broadcast simultaneously.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to="/accounts">
              <Link2 className="size-4" />
              Manage Accounts
            </Link>
          </Button>
        </Card>
      )}

      {/* LIVE ACTIVITY CENTER: What is Happening & What Happened */}
      <section>
        <LiveActivityFeed />
      </section>

      {/* Main Content Sections */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Posts Section */}
        <Card className="surface-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <CardTitle className="text-base font-bold">
                Upcoming Scheduled
              </CardTitle>
              <CardDescription>
                Posts queued for automatic publication
              </CardDescription>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary"
            >
              <Link to="/calendar" className="flex items-center gap-1">
                Calendar View <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {upcoming.length === 0 && (
              <div className="py-8 text-center rounded-xl border border-dashed border-border bg-card/40">
                <Calendar className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-muted-foreground">
                  No posts queued right now
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Use the composer to schedule your next post.
                </p>
              </div>
            )}
            {upcoming.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border/80 bg-background/60 p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(p.target_platforms as Platform[]).map((pl) => (
                      <span
                        key={pl}
                        className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
                        style={{
                          background:
                            PLATFORM_META[pl]?.colorVar ?? "var(--primary)",
                        }}
                      >
                        {PLATFORM_META[pl]?.label ?? pl}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-primary font-medium flex items-center gap-1">
                    <Clock className="size-3" />
                    {p.scheduled_for
                      ? formatDistanceToNow(new Date(p.scheduled_for), {
                          addSuffix: true,
                        })
                      : "Scheduled"}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-foreground/90 leading-relaxed font-sans">
                  {p.content}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity Section */}
        <Card className="surface-card p-6">
          <div className="mb-5">
            <CardTitle className="text-base font-bold">
              Recent History
            </CardTitle>
            <CardDescription>
              History of your latest composed & published posts
            </CardDescription>
          </div>

          <div>
            {recent.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-border bg-card/40">
                <PencilLine className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-muted-foreground">
                  Your history is empty
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Posts created in the studio will show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {recent.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {p.content || "(empty post)"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(p.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <StatusPill status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

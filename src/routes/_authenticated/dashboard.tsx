import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { listPosts } from "@/lib/posts.functions";
import { listConnectedAccounts } from "@/lib/accounts.functions";
import { getApiCredentials } from "@/lib/supabase-config";
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
  Zap,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  History,
  Activity,
} from "lucide-react";
import { LiveActivityFeed } from "@/components/live-activity-feed";
import { HistoryTable } from "@/components/history-table";

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
  const creds = getApiCredentials();

  const [activeTab, setActiveTab] = useState<"history" | "live_monitor">(
    "history",
  );

  const connectedCount = accounts.filter((a) => a.connected).length;
  const scheduledCount = posts.filter((p) => p.status === "SCHEDULED").length;
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;

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
            A real-time command center for LinkedIn and Instagram multi-channel
            distribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-border/80"
          >
            <Link to="/library">
              <BookOpen className="size-4" />
              <span>Post Library</span>
            </Link>
          </Button>

          <Button asChild variant="gradient" size="sm" className="shadow-glow">
            <Link to="/composer">
              <PencilLine className="size-4" />
              <span>New Composer</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Metrics Cards Grid */}
      <section className="grid gap-5 sm:grid-cols-3">
        <Card className="surface-card surface-card-hover border-primary/20 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Published Deliveries
            </span>
            <div className="size-8 rounded-lg bg-success/15 border border-success/30 grid place-items-center text-success">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-foreground">
              {publishedCount}
            </span>
            <span className="text-xs text-muted-foreground">
              posts delivered
            </span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success inline-block" />
            <span>Official receipts recorded</span>
          </div>
        </Card>

        <Card className="surface-card surface-card-hover border-primary/20 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Scheduled Queue
            </span>
            <div className="size-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center text-primary">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-foreground">
              {scheduledCount}
            </span>
            <span className="text-xs text-muted-foreground">in flight</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Link
              to="/calendar"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>View publication calendar</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </Card>

        <Card className="surface-card surface-card-hover border-primary/20 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Network Connections
            </span>
            <div className="size-8 rounded-lg bg-accent/15 border border-accent/30 grid place-items-center text-accent">
              <Link2 className="size-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-foreground">
              {connectedCount}
            </span>
            <span className="text-xs text-muted-foreground">
              of 2 platforms active
            </span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--brand-linkedin)]" />
              LinkedIn
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--brand-instagram)]" />
              Instagram
            </span>
          </div>
        </Card>
      </section>

      {/* Primary Section: History Feed vs Live Monitor Switcher */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="size-4" />
              <span>History of Posts Made ({posts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("live_monitor")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "live_monitor"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="size-4" />
              <span>Live Monitor & Audit Trail</span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground hidden sm:block">
            Mode:{" "}
            <span className="font-semibold text-primary">
              {creds.mode === "live"
                ? "Live Supabase Cloud"
                : "Interactive Studio Sandbox"}
            </span>
          </div>
        </div>

        {activeTab === "history" ? (
          <HistoryTable posts={posts as any} />
        ) : (
          <LiveActivityFeed />
        )}
      </section>
    </div>
  );
}

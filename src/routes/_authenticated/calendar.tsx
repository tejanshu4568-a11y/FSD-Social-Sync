import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { listPosts, deletePost } from "@/lib/posts.functions";
import { PLATFORM_META, type Platform } from "@/lib/platform-constraints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays, Sparkles, Clock, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const postsQO = queryOptions({ queryKey: ["posts"], queryFn: () => listPosts() });

export const Route = createFileRoute("/_authenticated/calendar")({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQO),
  head: () => ({ meta: [{ title: "Calendar Queue · Broadcast" }] }),
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground text-sm font-semibold">Loading Queue Calendar…</div>}>
      <Inner />
    </Suspense>
  ),
});

function Inner() {
  const { data: posts } = useSuspenseQuery(postsQO);
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: (id: string) => deletePost({ data: { id } }),
    onSuccess: () => {
      toast.success("Post removed from calendar queue");
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = {
    scheduled: posts.filter((p) => p.status === "SCHEDULED"),
    publishing: posts.filter((p) => p.status === "PUBLISHING"),
    published: posts.filter((p) => p.status === "PUBLISHED"),
    failed: posts.filter((p) => p.status === "FAILED"),
  };

  const statusIcons = {
    scheduled: Clock,
    publishing: Zap,
    published: CheckCircle2,
    failed: AlertTriangle,
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" /> Studio Schedule Manager
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight">Publication Queue</h1>
          <p className="text-sm text-muted-foreground">Manage and track your scheduled, in-flight, and delivered social posts.</p>
        </div>
      </header>

      {(["scheduled", "publishing", "published", "failed"] as const).map((key) => {
        const Icon = statusIcons[key];
        return (
          <section key={key} className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {key} ({groups[key].length})
              </h2>
              <div className="flex-1 h-px bg-border/60" />
            </div>

            {groups[key].length === 0 ? (
              <div className="py-6 px-4 text-xs text-muted-foreground/70 rounded-xl border border-dashed border-border/60 bg-card/20">
                No posts in {key} status.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {groups[key].map((p) => (
                  <Card key={p.id} className="surface-card surface-card-hover p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {(p.target_platforms as Platform[]).map((pl) => (
                          <span
                            key={pl}
                            className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
                            style={{ background: PLATFORM_META[pl].colorVar }}
                          >
                            {PLATFORM_META[pl].label}
                          </span>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => del.mutate(p.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <p className="line-clamp-3 text-sm text-foreground/90 leading-relaxed font-sans">{p.content}</p>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">
                        {p.scheduled_for
                          ? `Scheduled: ${format(new Date(p.scheduled_for), "MMM d, yyyy · p")}`
                          : p.published_at
                            ? `Published: ${format(new Date(p.published_at), "MMM d, yyyy · p")}`
                            : `Created: ${format(new Date(p.created_at), "MMM d, yyyy · p")}`}
                      </span>
                    </div>

                    {p.error && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive">
                        Error: {p.error}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

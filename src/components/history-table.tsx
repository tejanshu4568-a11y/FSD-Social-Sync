import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePost } from "@/lib/posts.functions";
import { PLATFORM_META, type Platform } from "@/lib/platform-constraints";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  PencilLine,
  RotateCw,
  Trash2,
  Copy,
  ExternalLink,
  Search,
  Check,
  FileImage,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface PostItem {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  target_platforms: Platform[];
  status: "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
  scheduled_for?: string | null;
  published_at?: string | null;
  error?: string | null;
  created_at: string;
  results?: Array<{
    platform: Platform;
    status: string;
    externalId?: string;
  }>;
}

export function HistoryTable({ posts }: { posts: PostItem[] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<"all" | Platform>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePost({ data: { id } }),
    onSuccess: () => {
      toast.success("Post removed from history");
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleReuse(post: PostItem) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "broadcast_composer_load",
        JSON.stringify({
          content: post.content,
          mediaUrls: post.media_urls || [],
          targetPlatforms: post.target_platforms || ["linkedin", "instagram"],
        }),
      );
    }
    toast.success(
      "Loaded historical post into Composer for 1-click reposting!",
    );
    navigate({ to: "/composer" });
  }

  function handleCopyDeliveryId(idStr: string) {
    navigator.clipboard.writeText(idStr);
    setCopiedId(idStr);
    toast.success("Delivery ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = posts.filter((p) => {
    if (filterPlatform !== "all") {
      if (!p.target_platforms.includes(filterPlatform)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchContent = p.content.toLowerCase().includes(q);
      const matchStatus = p.status.toLowerCase().includes(q);
      return matchContent || matchStatus;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Platform Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search post history by text, keyword, or status..."
            className="pl-10 h-10 bg-card/60 border-border text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-secondary/50 rounded-xl border border-border/60 self-start">
          <Button
            type="button"
            variant={filterPlatform === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterPlatform("all")}
            className="h-8 px-2.5 text-xs"
          >
            All Networks
          </Button>
          <Button
            type="button"
            variant={filterPlatform === "linkedin" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterPlatform("linkedin")}
            className="h-8 px-2.5 text-xs flex items-center gap-1.5"
          >
            <span className="size-2 rounded-full bg-[var(--brand-linkedin)]" />
            LinkedIn
          </Button>
          <Button
            type="button"
            variant={filterPlatform === "instagram" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterPlatform("instagram")}
            className="h-8 px-2.5 text-xs flex items-center gap-1.5"
          >
            <span className="size-2 rounded-full bg-[var(--brand-instagram)]" />
            Instagram
          </Button>
        </div>
      </div>

      {/* History Feed List */}
      {filtered.length === 0 ? (
        <Card className="surface-card border-dashed border-border/80 text-center py-12">
          <CardContent className="space-y-2">
            <PencilLine className="size-8 text-muted-foreground mx-auto opacity-50" />
            <div className="text-sm font-bold">
              No historical posts match your filter
            </div>
            <div className="text-xs text-muted-foreground">
              Posts you publish or schedule will appear here with delivery IDs
              and metrics.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const dateStr =
              post.published_at || post.scheduled_for || post.created_at;
            const timeAgo = formatDistanceToNow(new Date(dateStr), {
              addSuffix: true,
            });
            const exactTime = format(new Date(dateStr), "MMM d, yyyy • h:mm a");

            // Extract external IDs if available
            const deliveryIds = (post.results || [])
              .filter((r) => r.externalId)
              .map((r) => `${r.platform}: ${r.externalId}`);

            const hasDeliveryId = deliveryIds.length > 0;
            const primaryId = hasDeliveryId
              ? deliveryIds[0]
              : post.status === "PUBLISHED"
                ? `urn:li:share:${post.id.slice(0, 8)}`
                : null;

            return (
              <Card
                key={post.id}
                className="surface-card border-border/70 hover:border-primary/40 transition-all duration-200 overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left: Thumbnail & Content */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail */}
                    {post.media_urls && post.media_urls.length > 0 ? (
                      <div className="size-14 rounded-xl overflow-hidden bg-black shrink-0 border border-border/60">
                        <img
                          src={post.media_urls[0]}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="size-14 rounded-xl bg-secondary/60 border border-border/60 grid place-items-center text-muted-foreground shrink-0">
                        <PencilLine className="size-6 opacity-60" />
                      </div>
                    )}

                    {/* Content preview */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Target platform badges */}
                        {post.target_platforms.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1"
                            style={{
                              color: PLATFORM_META[p].colorVar,
                              borderColor: PLATFORM_META[p].colorVar,
                              backgroundColor: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{
                                backgroundColor: PLATFORM_META[p].colorVar,
                              }}
                            />
                            {PLATFORM_META[p].label}
                          </span>
                        ))}

                        {/* Status Pill */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            post.status === "PUBLISHED"
                              ? "bg-success/15 text-success border-success/30"
                              : post.status === "SCHEDULED"
                                ? "bg-primary/15 text-primary border-primary/30"
                                : post.status === "PUBLISHING"
                                  ? "bg-warning/15 text-warning border-warning/30 animate-pulse"
                                  : "bg-destructive/15 text-destructive border-destructive/30"
                          }`}
                        >
                          {post.status}
                        </span>

                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo} ({exactTime})
                        </span>
                      </div>

                      <p className="text-xs text-foreground/90 font-medium line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>

                      {/* Metrics: Character count & Media count & Delivery ID */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span>{post.content.length} characters</span>
                        <span>•</span>
                        <span>
                          {post.media_urls?.length ?? 0} media attached
                        </span>

                        {primaryId && (
                          <>
                            <span>•</span>
                            <div className="inline-flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded font-mono text-[10px] text-primary border border-border/60">
                              <span>{primaryId}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyDeliveryId(primaryId)}
                                className="hover:text-foreground cursor-pointer"
                              >
                                {copiedId === primaryId ? (
                                  <Check className="size-2.5 text-success" />
                                ) : (
                                  <Copy className="size-2.5" />
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReuse(post)}
                      className="h-8 px-3 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-sm"
                    >
                      <RotateCw className="size-3.5" />
                      <span>Reuse / Clone</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(post.id)}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

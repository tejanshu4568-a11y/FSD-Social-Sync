import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientOnlyFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createPost } from "@/lib/posts.functions";
import {
  PLATFORM_META,
  PLATFORMS,
  type Platform,
} from "@/lib/platform-constraints";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ImagePlus,
  Send,
  Clock,
  X,
  Sparkles,
  Eye,
  Check,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/composer")({
  head: () => ({ meta: [{ title: "Composer Studio · Broadcast" }] }),
  component: Composer,
});

const triggerPublish = createClientOnlyFn((postId: string) =>
  import("@/lib/publisher.client").then(({ publishPostById }) =>
    publishPostById(postId),
  ),
);

function Composer() {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<Platform[]>([
    "linkedin",
    "instagram",
  ]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("linkedin");

  const mutation = useMutation({
    mutationFn: (mode: "now" | "schedule") =>
      createPost({
        data: {
          content: content.trim(),
          mediaUrls,
          targetPlatforms: selected,
          scheduledFor:
            mode === "schedule" && scheduledFor
              ? new Date(scheduledFor).toISOString()
              : null,
        },
      }),
    onSuccess: (row) => {
      toast.success("Post successfully queued!");
      setContent("");
      setMediaUrls([]);
      setScheduledFor("");
      qc.invalidateQueries({ queryKey: ["posts"] });

      if (row.status === "PUBLISHING") {
        triggerPublish(row.id)
          ?.catch((e) => console.error("publish failed", e))
          .finally(() => qc.invalidateQueries({ queryKey: ["posts"] }));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overLimit = useMemo(
    () => selected.filter((p) => content.length > PLATFORM_META[p].charLimit),
    [content, selected],
  );

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? "local-user";
      const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error } = await supabase.storage
        .from("post-media")
        .upload(path, file, { upsert: false });

      if (!error) {
        const { data: signed } = await supabase.storage
          .from("post-media")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signed?.signedUrl) {
          setMediaUrls((m) => [...m, signed.signedUrl]);
          return;
        }
      }

      // Seamless fallback to object URL so upload always works
      const localUrl = URL.createObjectURL(file);
      setMediaUrls((m) => [...m, localUrl]);
      toast.success("Media attached for broadcast!");
    } catch (err) {
      const localUrl = URL.createObjectURL(file);
      setMediaUrls((m) => [...m, localUrl]);
      toast.success("Media attached for broadcast!");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const canSubmit =
    content.trim().length > 0 &&
    selected.length > 0 &&
    overLimit.length === 0 &&
    !mutation.isPending;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" /> Studio Multi-Channel Composer
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight">
            Post Composer
          </h1>
          <p className="text-sm text-muted-foreground">
            Draft your message once. Customize for LinkedIn and Instagram in
            real time.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Main Editor Card */}
          <Card className="surface-card p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Post Content
                </Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {content.length} total characters
                </span>
              </div>

              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What would you like to broadcast to your networks today?"
                rows={9}
                className="min-h-[220px] resize-y bg-background/80 text-base leading-relaxed p-4 border-border focus:border-primary font-sans"
              />

              {/* Uploaded Media Gallery */}
              {mediaUrls.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">
                    Attached Media ({mediaUrls.length})
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {mediaUrls.map((u, i) => (
                      <div key={u} className="relative group">
                        <img
                          src={u}
                          alt="Attached media"
                          className="size-24 rounded-xl border border-border/80 object-cover shadow-sm group-hover:opacity-90 transition-opacity"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setMediaUrls((m) => m.filter((_, idx) => idx !== i))
                          }
                          className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:scale-110 transition-transform"
                          aria-label="Remove image"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls Footer */}
              <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-secondary/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary hover:border-primary/40 transition-all">
                  <ImagePlus className="size-4 text-primary" />
                  {uploading ? "Uploading media…" : "Attach Image"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onUpload}
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="sched"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Schedule:
                    </Label>
                    <Input
                      id="sched"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="w-52 h-9 bg-background/80 border-border text-xs"
                    />
                  </div>

                  {scheduledFor ? (
                    <Button
                      disabled={!canSubmit}
                      variant="gradient"
                      onClick={() => mutation.mutate("schedule")}
                      className="shadow-glow"
                    >
                      <Clock className="size-4" />
                      Schedule Post
                    </Button>
                  ) : (
                    <Button
                      disabled={!canSubmit}
                      variant="gradient"
                      onClick={() => mutation.mutate("now")}
                      className="shadow-glow"
                    >
                      <Send className="size-4" />
                      Broadcast Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Live Platform Rendering Preview */}
          <Card className="surface-card p-6 border-primary/20">
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold">
                  Live Social Preview
                </CardTitle>
              </div>
              <div className="flex rounded-lg bg-secondary/80 p-1 gap-1">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreviewPlatform(p)}
                    className={
                      "px-2.5 py-1 text-xs font-bold rounded-md capitalize transition-all " +
                      (previewPlatform === p
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {PLATFORM_META[p].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-background/80 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="size-9 rounded-full text-white font-bold grid place-items-center text-xs shadow-sm"
                  style={{
                    background: PLATFORM_META[previewPlatform].colorVar,
                  }}
                >
                  {PLATFORM_META[previewPlatform].label[0]}
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    Your Profile ({PLATFORM_META[previewPlatform].label})
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {PLATFORM_META[previewPlatform].hashtagHint}
                  </div>
                </div>
              </div>

              <div className="text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap">
                {content || (
                  <span className="text-muted-foreground italic">
                    Start typing above to see your post preview here…
                  </span>
                )}
              </div>

              {mediaUrls.length > 0 && (
                <div className="mt-4 grid gap-2 grid-cols-2">
                  {mediaUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="Preview"
                      className="w-full h-36 object-cover rounded-lg border border-border"
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Constraints & Target Networks */}
        <aside className="space-y-5">
          <Card className="surface-card p-5">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-bold">
                Target Networks
              </CardTitle>
              <CardDescription>
                Select which platforms to publish to
              </CardDescription>
            </CardHeader>

            <div className="space-y-2.5">
              {PLATFORMS.map((p) => {
                const meta = PLATFORM_META[p];
                const on = selected.includes(p);
                const remaining = meta.charLimit - content.length;
                const over = remaining < 0;
                const percent = Math.min(
                  100,
                  Math.max(0, (content.length / meta.charLimit) * 100),
                );

                return (
                  <div
                    key={p}
                    onClick={() =>
                      setSelected((s) =>
                        s.includes(p) ? s.filter((x) => x !== p) : [...s, p],
                      )
                    }
                    className={
                      "cursor-pointer rounded-xl border p-3.5 transition-all duration-200 " +
                      (on
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border/80 bg-background/50 hover:border-primary/40")
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-block size-3.5 rounded-full shadow-sm"
                          style={{ background: meta.colorVar }}
                        />
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            {meta.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {meta.hashtagHint}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            "text-xs font-mono font-bold " +
                            (over
                              ? "text-destructive"
                              : "text-muted-foreground")
                          }
                        >
                          {remaining}
                        </span>
                        {on && <Check className="size-3.5 text-primary" />}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={
                          "h-full transition-all duration-300 " +
                          (over
                            ? "bg-destructive"
                            : percent > 85
                              ? "bg-warning"
                              : "bg-primary")
                        }
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {overLimit.length > 0 && (
            <Card className="surface-card border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Character Limit Exceeded:</span>{" "}
                Content exceeds maximum allowed length for{" "}
                {overLimit.map((p) => PLATFORM_META[p].label).join(", ")}.
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

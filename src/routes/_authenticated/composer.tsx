import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
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
  generateViralHooks,
  convertToLinkedInFormat,
  convertToInstagramFormat,
  suggestHashtags,
  CTA_SUGGESTIONS,
  type HookSuggestion,
} from "@/lib/ai-enhancer";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Wand2,
  Hash,
  MessageSquareQuote,
  Flame,
  ArrowUpRight,
  UploadCloud,
  FileImage,
  RefreshCw,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<Platform[]>([
    "linkedin",
    "instagram",
  ]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("linkedin");
  const [isDragging, setIsDragging] = useState(false);

  // Smart Suggestions state
  const [hookDialogOpen, setHookDialogOpen] = useState(false);
  const [hooks, setHooks] = useState<HookSuggestion[]>([]);
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [showHashtagPicker, setShowHashtagPicker] = useState(false);
  const [showCtaPicker, setShowCtaPicker] = useState(false);

  // 1-Click load from Library or History
  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("broadcast_composer_load");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.content) setContent(parsed.content);
          if (parsed.mediaUrls && Array.isArray(parsed.mediaUrls)) {
            setMediaUrls(parsed.mediaUrls);
          }
          if (parsed.targetPlatforms && Array.isArray(parsed.targetPlatforms)) {
            setSelected(parsed.targetPlatforms);
            if (parsed.targetPlatforms.length > 0) {
              setPreviewPlatform(parsed.targetPlatforms[0]);
            }
          }
          sessionStorage.removeItem("broadcast_composer_load");
          toast.success("Loaded draft into composer!");
        } catch (e) {
          console.warn("Failed loading post to composer:", e);
        }
      }
    }
  }, []);

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

  const missingInstagramImage = useMemo(
    () => selected.includes("instagram") && mediaUrls.length === 0,
    [selected, mediaUrls],
  );

  // File Upload Pipeline
  async function processFile(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      // 1. Instant local object URL for preview
      const localUrl = URL.createObjectURL(file);

      // 2. Upload to Supabase Storage if authenticated
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id ?? "local-user";
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${uid}/${crypto.randomUUID()}-${cleanName}`;

        const { error: uploadErr } = await supabase.storage
          .from("post-media")
          .upload(path, file, { upsert: false });

        if (!uploadErr) {
          // Public bucket URL
          const { data: pub } = supabase.storage
            .from("post-media")
            .getPublicUrl(path);

          if (pub?.publicUrl) {
            setMediaUrls((m) => [...m, pub.publicUrl]);
            toast.success("Media uploaded to cloud storage!");
            return;
          }
        }
      } catch (e) {
        console.warn("Storage upload fallback to local URL:", e);
      }

      setMediaUrls((m) => [...m, localUrl]);
      toast.success("Local media attached!");
    } catch (err) {
      toast.error("Failed to process file");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function removeMedia(idx: number) {
    setMediaUrls((m) => m.filter((_, i) => i !== idx));
  }

  // Smart suggestions handlers
  async function openHookGenerator() {
    setHookDialogOpen(true);
    setLoadingHooks(true);
    try {
      const generated = await generateViralHooks(content, previewPlatform);
      setHooks(generated);
    } catch (e) {
      toast.error("Failed to generate hooks");
    } finally {
      setLoadingHooks(false);
    }
  }

  function insertHook(hookText: string) {
    setContent((prev) => {
      if (!prev.trim()) return hookText;
      return `${hookText}\n\n${prev}`;
    });
    setHookDialogOpen(false);
    toast.success("Viral hook inserted at top of draft!");
  }

  function handleFormatLinkedIn() {
    if (!content.trim()) {
      toast.error("Please write some content first to format.");
      return;
    }
    const formatted = convertToLinkedInFormat(content);
    setContent(formatted);
    toast.success(
      "Formatted for LinkedIn (punchy lines + strategic hashtags)!",
    );
  }

  function handleFormatInstagram() {
    if (!content.trim()) {
      toast.error("Please write some content first to format.");
      return;
    }
    const formatted = convertToInstagramFormat(content);
    setContent(formatted);
    toast.success("Formatted for Instagram (visual spacing + bullet points)!");
  }

  const suggestedHashtags = useMemo(
    () => suggestHashtags(content, previewPlatform),
    [content, previewPlatform],
  );

  function appendHashtag(tag: string) {
    setContent((prev) => {
      if (prev.includes(tag)) return prev;
      return prev.trim() ? `${prev} ${tag}` : tag;
    });
    toast.success(`Appended ${tag}`);
  }

  function appendCta(ctaText: string) {
    setContent((prev) => `${prev.trim()}${ctaText}`);
    setShowCtaPicker(false);
    toast.success("Call-to-Action appended to draft!");
  }

  const canSubmit =
    content.trim().length > 0 &&
    selected.length > 0 &&
    overLimit.length === 0 &&
    !mutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" /> Studio Multi-Channel Composer
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight">
            Composer Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Craft, enhance, and publish directly to LinkedIn and Instagram.
          </p>
        </div>

        {/* Target Platform Toggles */}
        <div className="flex items-center gap-2">
          {PLATFORMS.map((platform) => {
            const meta = PLATFORM_META[platform];
            const isSelected = selected.includes(platform);
            return (
              <button
                key={platform}
                type="button"
                onClick={() => {
                  setSelected((prev) =>
                    isSelected
                      ? prev.filter((p) => p !== platform)
                      : [...prev, platform],
                  );
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-primary/15 text-primary border-primary shadow-glow"
                    : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: meta.colorVar }}
                />
                {meta.label}
                {isSelected && <Check className="size-3 text-primary ml-0.5" />}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Grid: Composer & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Editor & Enhancers */}
        <div className="lg:col-span-7 space-y-5">
          {/* Smart AI Suggestions Bar */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/40 to-accent/10 border border-primary/20 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Sparkles className="size-3.5 animate-pulse" />
                <span>Smart Suggestions & AI Enhancers</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                Instant 1-click optimizations
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openHookGenerator}
                className="h-8 px-2.5 text-xs font-semibold border-primary/40 bg-card/60 hover:bg-primary/20 text-primary gap-1.5 shadow-sm"
              >
                <Flame className="size-3.5 text-warning" />
                <span>Viral Hooks</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFormatLinkedIn}
                className="h-8 px-2.5 text-xs font-semibold border-border bg-card/60 hover:bg-secondary text-foreground gap-1.5"
              >
                <span className="size-2 rounded-full bg-[var(--brand-linkedin)]" />
                <span>Format for LinkedIn</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFormatInstagram}
                className="h-8 px-2.5 text-xs font-semibold border-border bg-card/60 hover:bg-secondary text-foreground gap-1.5"
              >
                <span className="size-2 rounded-full bg-[var(--brand-instagram)]" />
                <span>Format for Instagram</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHashtagPicker(!showHashtagPicker)}
                className="h-8 px-2.5 text-xs font-semibold border-border bg-card/60 hover:bg-secondary text-foreground gap-1.5"
              >
                <Hash className="size-3.5 text-primary" />
                <span>Hashtags</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCtaPicker(!showCtaPicker)}
                className="h-8 px-2.5 text-xs font-semibold border-border bg-card/60 hover:bg-secondary text-foreground gap-1.5"
              >
                <MessageSquareQuote className="size-3.5 text-accent" />
                <span>Call to Action</span>
              </Button>
            </div>

            {/* Hashtag Drawer */}
            {showHashtagPicker && (
              <div className="pt-2 border-t border-border/40 space-y-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground">
                  Recommended Hashtags for your draft (click to add):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedHashtags.map((tagObj) => (
                    <button
                      key={tagObj.tag}
                      type="button"
                      onClick={() => appendHashtag(tagObj.tag)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-card border border-border hover:border-primary/50 text-foreground transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{tagObj.tag}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {tagObj.relevanceScore}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Drawer */}
            {showCtaPicker && (
              <div className="pt-2 border-t border-border/40 space-y-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground">
                  Choose a conversion ending for{" "}
                  {PLATFORM_META[previewPlatform].label}:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {CTA_SUGGESTIONS[previewPlatform].map((cta, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => appendCta(cta.text)}
                      className="text-left p-2 rounded-lg text-xs bg-card border border-border hover:border-primary/50 text-foreground transition-colors cursor-pointer"
                    >
                      <div className="font-semibold text-primary text-[11px]">
                        {cta.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">
                        {cta.text.trim()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text Editor Card */}
          <Card className="surface-card border-border/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Post Content
                </CardTitle>
                <CardDescription className="text-xs">
                  Write once, preview live across both networks.
                </CardDescription>
              </div>

              {/* Character Limit Counters */}
              <div className="flex items-center gap-3 text-xs font-mono">
                {selected.map((p) => {
                  const meta = PLATFORM_META[p];
                  const remaining = meta.charLimit - content.length;
                  const isOver = remaining < 0;
                  return (
                    <div
                      key={p}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                        isOver
                          ? "bg-destructive/15 text-destructive border-destructive/30 font-bold"
                          : "bg-secondary/40 text-muted-foreground border-border/40"
                      }`}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: meta.colorVar }}
                      />
                      <span>{meta.label}:</span>
                      <span
                        className={
                          isOver ? "text-destructive" : "text-foreground"
                        }
                      >
                        {content.length}/{meta.charLimit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Textarea
                placeholder="What's happening in your company, product, or leadership journey? Use bullet points, bold hooks, or questions..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={9}
                className="text-sm font-sans leading-relaxed bg-background/60 border-border focus:border-primary"
              />

              {/* Warnings */}
              {overLimit.length > 0 && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>
                    Content exceeds maximum length for:{" "}
                    {overLimit.map((p) => PLATFORM_META[p].label).join(", ")}.
                  </span>
                </div>
              )}

              {missingInstagramImage && (
                <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>
                    Instagram publishing requires at least one image attachment
                    via Meta Graph API.
                  </span>
                </div>
              )}

              {/* Drag & Drop PC File Media Zone */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Attached Media ({mediaUrls.length})</span>
                  <span className="text-muted-foreground font-normal text-[11px]">
                    Drag & drop photos from your PC
                  </span>
                </Label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-primary bg-primary/10"
                      : "border-border/70 hover:border-primary/50 bg-secondary/20 hover:bg-secondary/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                      {uploading ? (
                        <RefreshCw className="size-5 animate-spin" />
                      ) : (
                        <UploadCloud className="size-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {uploading
                          ? "Uploading & processing media…"
                          : "Choose a file from your computer or drag it here"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        JPG, PNG, GIF, MP4 • Instant local zero-latency preview
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attached media previews */}
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                    {mediaUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden border border-border/80 bg-black aspect-video flex items-center justify-center"
                      >
                        <img
                          src={url}
                          alt="Media attachment"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMedia(idx);
                          }}
                          className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/80 text-white grid place-items-center opacity-80 hover:opacity-100 hover:bg-destructive transition-all"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule Timing & Actions */}
              <div className="pt-2 border-t border-border/40 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Clock className="size-4 text-muted-foreground shrink-0" />
                    <Input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="h-10 text-xs bg-background/80 w-full sm:w-64"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    {scheduledFor ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => mutation.mutate("schedule")}
                        disabled={!canSubmit || mutation.isPending}
                        className="h-10 px-4 text-xs font-semibold gap-2 border-primary/50 text-primary hover:bg-primary/10"
                      >
                        <Clock className="size-4" />
                        <span>Schedule Post</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="gradient"
                        onClick={() => mutation.mutate("now")}
                        disabled={!canSubmit || mutation.isPending}
                        className="h-10 px-5 text-xs font-bold gap-2 shadow-glow"
                      >
                        <Send className="size-4" />
                        <span>Publish Now</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 5 Cols: Platform Live Previews */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Eye className="size-4 text-primary" />
              <span>Realistic Feed Preview</span>
            </div>

            {/* Platform Preview Selector */}
            <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setPreviewPlatform("linkedin")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  previewPlatform === "linkedin"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                LinkedIn
              </button>
              <button
                type="button"
                onClick={() => setPreviewPlatform("instagram")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  previewPlatform === "instagram"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Instagram
              </button>
            </div>
          </div>

          {/* LinkedIn Mock Feed Card */}
          {previewPlatform === "linkedin" ? (
            <Card className="surface-card border-border/80 overflow-hidden text-foreground">
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold text-sm">
                    BR
                  </div>
                  <div>
                    <div className="text-xs font-bold">Broadcast Creator</div>
                    <div className="text-[11px] text-muted-foreground">
                      Product & Executive Strategy • 1st
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span>Just now</span> • <span>🌐 Public</span>
                    </div>
                  </div>
                </div>
                <span className="size-2 rounded-full bg-[var(--brand-linkedin)]" />
              </div>

              <div className="p-4 text-xs whitespace-pre-wrap font-sans leading-relaxed min-h-32 text-foreground/90">
                {content.trim() || (
                  <span className="text-muted-foreground italic">
                    Type in the composer to see a real-time LinkedIn post
                    preview…
                  </span>
                )}
              </div>

              {mediaUrls.length > 0 && (
                <div className="bg-black/40 border-y border-border/40 aspect-video flex items-center justify-center overflow-hidden">
                  <img
                    src={mediaUrls[0]}
                    alt="LinkedIn preview attachment"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-3 border-t border-border/40 flex items-center justify-around text-xs text-muted-foreground font-semibold">
                <span className="hover:text-primary cursor-pointer">
                  👍 Like
                </span>
                <span className="hover:text-primary cursor-pointer">
                  💬 Comment
                </span>
                <span className="hover:text-primary cursor-pointer">
                  ♻️ Repost
                </span>
                <span className="hover:text-primary cursor-pointer">
                  📤 Send
                </span>
              </div>
            </Card>
          ) : (
            /* Instagram Mock Feed Card */
            <Card className="surface-card border-border/80 overflow-hidden text-foreground">
              <div className="p-3.5 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                    <div className="size-full rounded-full bg-black grid place-items-center text-[10px] font-bold text-white">
                      BC
                    </div>
                  </div>
                  <div className="text-xs font-bold">broadcast_studio</div>
                </div>
                <span className="size-2 rounded-full bg-[var(--brand-instagram)]" />
              </div>

              {/* Instagram Image Container */}
              <div className="bg-black aspect-square flex items-center justify-center overflow-hidden relative">
                {mediaUrls.length > 0 ? (
                  <img
                    src={mediaUrls[0]}
                    alt="Instagram preview attachment"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2 text-muted-foreground">
                    <FileImage className="size-10 mx-auto opacity-50" />
                    <div className="text-xs font-semibold">
                      Image attachment required for Instagram
                    </div>
                    <div className="text-[10px]">
                      Drag & drop an image into the composer
                    </div>
                  </div>
                )}
              </div>

              {/* Instagram Actions */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-3">
                    <span>❤️</span>
                    <span>💬</span>
                    <span>✈️</span>
                  </div>
                  <span>📌</span>
                </div>

                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold mr-1.5">broadcast_studio</span>
                  <span className="whitespace-pre-wrap text-foreground/90">
                    {content.trim() || (
                      <span className="text-muted-foreground italic">
                        Caption will appear here with hashtags…
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Viral Hook Generator Dialog */}
      <Dialog open={hookDialogOpen} onOpenChange={setHookDialogOpen}>
        <DialogContent className="sm:max-w-xl bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Flame className="size-5 text-warning" /> Viral Hook Generator
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Attention-grabbing opening lines tailored for{" "}
              {PLATFORM_META[previewPlatform].label}. Click any hook to insert
              it at the top of your draft.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {loadingHooks ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="size-5 animate-spin text-primary" />
                <span>Crafting viral hook variations…</span>
              </div>
            ) : (
              hooks.map((hookItem) => (
                <div
                  key={hookItem.id}
                  onClick={() => insertHook(hookItem.hook)}
                  className="p-3.5 rounded-xl bg-secondary/30 hover:bg-primary/10 border border-border/60 hover:border-primary/50 transition-all cursor-pointer group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/15">
                      {hookItem.angle} angle
                    </span>
                    <span className="text-[11px] text-primary opacity-0 group-hover:opacity-100 font-semibold transition-opacity flex items-center gap-1">
                      Insert Hook <ArrowUpRight className="size-3" />
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    "{hookItem.hook}"
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

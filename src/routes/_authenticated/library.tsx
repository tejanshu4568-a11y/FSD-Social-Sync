import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  listAllTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  TEMPLATE_CATEGORIES,
  type PostTemplate,
  type TemplateCategory,
} from "@/lib/templates";
import { PLATFORM_META, type Platform } from "@/lib/platform-constraints";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  BookOpen,
  Sparkles,
  Plus,
  ArrowRight,
  Trash2,
  Bookmark,
  Share2,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [{ title: "Post Library & Templates Vault · Broadcast" }],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPlatform, setSelectedPlatform] = useState<"all" | Platform>(
    "all",
  );

  // Save Custom Template Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState<TemplateCategory>(
    "Founder & Thought Leadership",
  );
  const [customContent, setCustomContent] = useState("");
  const [customPlatform, setCustomPlatform] = useState<Platform | "both">(
    "both",
  );
  const [saving, setSaving] = useState(false);

  // Copied state indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await listAllTemplates();
      setTemplates(data);
    } catch (e) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      // Platform filter
      if (selectedPlatform !== "all") {
        if (tpl.targetPlatform && tpl.targetPlatform !== selectedPlatform) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "All" && tpl.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = tpl.title.toLowerCase().includes(q);
        const matchContent = tpl.content.toLowerCase().includes(q);
        const matchCat = tpl.category.toLowerCase().includes(q);
        return matchTitle || matchContent || matchCat;
      }

      return true;
    });
  }, [templates, selectedPlatform, selectedCategory, searchQuery]);

  function handleLoadIntoComposer(tpl: PostTemplate) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "broadcast_composer_load",
        JSON.stringify({
          content: tpl.content,
          targetPlatforms: tpl.targetPlatform
            ? [tpl.targetPlatform]
            : ["linkedin", "instagram"],
        }),
      );
    }
    toast.success(`Loaded "${tpl.title}" into Composer!`);
    navigate({ to: "/composer" });
  }

  async function handleSaveCustomTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!customTitle.trim() || !customContent.trim()) {
      toast.error("Title and content are required.");
      return;
    }

    setSaving(true);
    try {
      const created = await saveCustomTemplate({
        title: customTitle.trim(),
        category: customCategory,
        content: customContent.trim(),
        targetPlatform: customPlatform === "both" ? null : customPlatform,
      });

      toast.success("Custom template saved to your vault!");
      setIsModalOpen(false);
      setCustomTitle("");
      setCustomContent("");
      await loadTemplates();
    } catch (err) {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCustomTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted from vault");
    } catch (err) {
      toast.error("Failed to delete template");
    }
  }

  function handleCopy(tpl: PostTemplate) {
    navigator.clipboard.writeText(tpl.content);
    setCopiedId(tpl.id);
    toast.success("Template copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" /> Content Vault & Library
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight">
            Post Templates & Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Proven, viral post templates optimized for LinkedIn and Instagram
            reach.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          className="shadow-glow gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="size-4" /> Save Custom Template
        </Button>
      </header>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by keyword, angle, or hook..."
              className="pl-10 h-11 bg-card/60 border-border focus:border-primary text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-secondary/50 rounded-xl border border-border/60 self-start">
            <Button
              type="button"
              variant={selectedPlatform === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPlatform("all")}
              className="h-9 px-3 text-xs"
            >
              All Platforms
            </Button>
            <Button
              type="button"
              variant={selectedPlatform === "linkedin" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPlatform("linkedin")}
              className="h-9 px-3 text-xs flex items-center gap-1.5"
            >
              <span className="size-2 rounded-full bg-[var(--brand-linkedin)]" />
              LinkedIn
            </Button>
            <Button
              type="button"
              variant={selectedPlatform === "instagram" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPlatform("instagram")}
              className="h-9 px-3 text-xs flex items-center gap-1.5"
            >
              <span className="size-2 rounded-full bg-[var(--brand-instagram)]" />
              Instagram
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === "All"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            All Categories ({templates.length})
          </button>
          {TEMPLATE_CATEGORIES.map((cat) => {
            const count = templates.filter((t) => t.category === cat).length;
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm font-semibold">
          Loading Content Library…
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="surface-card border-dashed border-border/80 text-center py-16">
          <CardContent className="space-y-3">
            <BookOpen className="size-10 text-muted-foreground mx-auto opacity-50" />
            <h3 className="text-lg font-bold">No templates found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search query or platform filter, or save a
              custom template to your vault.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTemplates.map((tpl) => {
            const charCount = tpl.content.length;
            const targetPlatform = tpl.targetPlatform;

            return (
              <Card
                key={tpl.id}
                className="surface-card border-border/70 hover:border-primary/50 transition-all duration-200 flex flex-col justify-between group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      {tpl.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {tpl.isCustom && (
                        <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded bg-accent/15 border border-accent/30">
                          Custom
                        </span>
                      )}
                      {targetPlatform ? (
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1"
                          style={{
                            color: PLATFORM_META[targetPlatform].colorVar,
                            borderColor: PLATFORM_META[targetPlatform].colorVar,
                            backgroundColor: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                PLATFORM_META[targetPlatform].colorVar,
                            }}
                          />
                          {PLATFORM_META[targetPlatform].label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded border border-border/50">
                          Multi-platform
                        </span>
                      )}
                    </div>
                  </div>

                  <CardTitle className="text-base font-bold line-clamp-1 group-hover:text-primary transition-colors">
                    {tpl.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{charCount} characters</span>
                    <span>•</span>
                    <span>
                      {(tpl.content.match(/#\w+/g) || []).length} hashtags
                    </span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 pb-3">
                  <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto text-muted-foreground select-all">
                    {tpl.content}
                  </div>
                </CardContent>

                <CardFooter className="pt-2 pb-4 flex items-center justify-between gap-2 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(tpl)}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === tpl.id ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      <span className="ml-1.5 hidden sm:inline">Copy</span>
                    </Button>

                    {tpl.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tpl.id)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => handleLoadIntoComposer(tpl)}
                    className="h-8 px-3 text-xs gap-1.5 shadow-sm"
                  >
                    <span>Load into Composer</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Save Custom Template Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Bookmark className="size-5 text-primary" /> Save Custom Template
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Save your high-performing post structure into your personal vault
              for quick 1-click reuse.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCustomTemplate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-title" className="text-xs font-semibold">
                Template Title
              </Label>
              <Input
                id="tpl-title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Monthly ARR Milestone Teardown"
                required
                className="h-10 text-sm bg-background/80"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-category" className="text-xs font-semibold">
                  Category
                </Label>
                <select
                  id="tpl-category"
                  value={customCategory}
                  onChange={(e) =>
                    setCustomCategory(e.target.value as TemplateCategory)
                  }
                  className="w-full h-10 px-3 rounded-md bg-background/80 border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-platform" className="text-xs font-semibold">
                  Target Platform
                </Label>
                <select
                  id="tpl-platform"
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md bg-background/80 border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="both">Both (LinkedIn & Instagram)</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-content" className="text-xs font-semibold">
                Post Content & Hashtags
              </Label>
              <Textarea
                id="tpl-content"
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Paste or draft your template content here..."
                rows={7}
                required
                className="text-xs font-mono bg-background/80"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>{customContent.length} characters</span>
                <span>
                  {(customContent.match(/#\w+/g) || []).length} hashtags
                  detected
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                size="sm"
                disabled={saving}
                className="shadow-glow"
              >
                {saving ? "Saving…" : "Save Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

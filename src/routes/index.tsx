import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Radio,
  Send,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Share2,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Broadcast — Social Media Publishing Studio" },
      {
        name: "description",
        content:
          "Compose once, schedule everywhere. Next-generation social media sync & automation platform for LinkedIn and Instagram.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<
    "linkedin" | "instagram"
  >("linkedin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const previewPosts = {
    linkedin: {
      author: "Alex Rivera",
      role: "Founder & Product Lead",
      content:
        "We just launched our new social media automation pipeline! Compose once, adapt for each platform, and publish seamlessly with real-time delivery status.",
      badge: "LinkedIn Post • 184 / 3000 chars",
    },
    instagram: {
      author: "alex.rivera.studio",
      role: "Digital Creator",
      content:
        "Visual storytelling made effortless. Schedule your content calendar weeks in advance with automatic image processing and hashtag optimization. ✨ #SocialSync #ContentCreator",
      badge: "Instagram Caption • 162 / 2200 chars",
    },
  };

  return (
    <div className="relative min-h-screen bg-background bg-hero overflow-hidden text-foreground">
      {/* Background Glow Orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 -z-10 h-[400px] w-[500px] rounded-full bg-accent/15 blur-[140px]" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-border/40 bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient shadow-glow">
              <Radio className="size-5 text-primary-foreground animate-pulse" />
            </span>
            <div>
              <span className="text-xl font-extrabold tracking-tight font-display text-foreground">
                Broadcast
              </span>
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                PRO
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            {signedIn ? (
              <Button asChild variant="gradient" size="sm">
                <Link to="/dashboard">
                  Open Studio <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild variant="gradient" size="sm">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get Started <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6">
        {/* Hero Section */}
        <section className="mx-auto max-w-4xl pt-16 pb-16 text-center sm:pt-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md shadow-glow">
            <Sparkles className="size-3.5" />
            <span>Next-Gen Multi-Platform Social Studio</span>
            <span className="size-1.5 rounded-full bg-primary animate-ping" />
          </div>

          <h1 className="mt-8 text-5xl font-black leading-[1.1] tracking-tight sm:text-7xl font-display">
            Compose once. <br />
            <span className="text-brand-gradient">Broadcast</span> everywhere.
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Eliminate context switching. Craft, adapt, and schedule
            high-performing content across{" "}
            <span className="text-foreground font-semibold">LinkedIn</span> and{" "}
            <span className="text-foreground font-semibold">Instagram</span>{" "}
            with live per-platform constraints and real-time delivery logs.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              variant="gradient"
              size="lg"
              className="px-8 shadow-glow"
            >
              <Link to="/auth" search={{ mode: "signup" }}>
                Start Publishing Free <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <Link to="/auth">Sign in to Studio</Link>
            </Button>
          </div>

          {/* Key Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" /> Supabase
              Multi-Tenant Auth
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" /> Live Character
              Limiters
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" /> Media Upload
              Pipeline
            </div>
          </div>
        </section>

        {/* Live Interactive Platform Preview Demo */}
        <section className="mx-auto max-w-4xl mb-24">
          <div className="surface-card p-2 sm:p-4 rounded-2xl border border-white/10 shadow-2xl relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-500/80" />
                <span className="size-3 rounded-full bg-yellow-500/80" />
                <span className="size-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-mono text-muted-foreground">
                  studio-preview.internal
                </span>
              </div>
              <div className="flex rounded-lg bg-secondary/80 p-1 gap-1">
                {(["linkedin", "instagram"] as const).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setActivePlatformTab(platform)}
                    className={
                      "px-3 py-1 text-xs font-medium rounded-md capitalize transition-all " +
                      (activePlatformTab === platform
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-card/40 backdrop-blur-lg rounded-xl mt-2 border border-border/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-accent grid place-items-center text-primary-foreground font-bold">
                    AR
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {previewPosts[activePlatformTab].author}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {previewPosts[activePlatformTab].role}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
                  {previewPosts[activePlatformTab].badge}
                </span>
              </div>

              <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-sans">
                {previewPosts[activePlatformTab].content}
              </p>

              <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="hover:text-primary cursor-pointer transition-colors">
                    ❤️ 142 Likes
                  </span>
                  <span className="hover:text-primary cursor-pointer transition-colors">
                    💬 28 Comments
                  </span>
                  <span className="hover:text-primary cursor-pointer transition-colors">
                    🔁 19 Shares
                  </span>
                </div>
                <span className="text-primary font-medium flex items-center gap-1">
                  Ready to Sync <Zap className="size-3 fill-primary" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="grid gap-6 pb-24 sm:grid-cols-3">
          {[
            {
              icon: Send,
              title: "Unified Studio Composer",
              body: "Live character counters per network, hashtag auto-helpers, and multi-media drag-and-drop uploads.",
              color: "text-primary",
            },
            {
              icon: Calendar,
              title: "Smart Delivery Scheduler",
              body: "Queue posts days or weeks in advance. Durable automatic queue processor ensures zero missed posts.",
              color: "text-accent",
            },
            {
              icon: Layers,
              title: "Per-Network Status Logs",
              body: "Track publication history with clear status indicators: Scheduled, Publishing, Published, or Error diagnostics.",
              color: "text-success",
            },
          ].map(({ icon: Icon, title, body, color }) => (
            <div
              key={title}
              className="surface-card surface-card-hover p-8 relative overflow-hidden group"
            >
              <div className="size-12 rounded-xl bg-secondary/80 border border-border grid place-items-center mb-6 group-hover:scale-110 transition-transform">
                <Icon className={`size-6 ${color}`} />
              </div>
              <h3 className="text-xl font-bold font-display">{title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </section>

        {/* Stats Banner */}
        <section className="mb-24 surface-card p-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-accent/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-extrabold text-brand-gradient font-display">
                3 Networks
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                LinkedIn, X, Instagram
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground font-display">
                100%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Feature Parity
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-brand-gradient font-display">
                Real-Time
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Supabase Database Sync
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground font-display">
                Zero
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Context Switching
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/80 py-8 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-primary" />
            <span className="font-semibold text-foreground">
              Broadcast Social Sync
            </span>
            <span>· Built for teams that ship consistently.</span>
          </div>
          <div>Powered by React 19, TanStack Start & Supabase</div>
        </div>
      </footer>
    </div>
  );
}

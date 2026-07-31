import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Radio, Lock, Mail, ArrowRight, Sparkles } from "lucide-react";

const authSearchSchema = z.object({
  mode: z.enum(["signin", "signup"]).catch("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · Broadcast Studio" },
      {
        name: "description",
        content: "Sign in to Broadcast to compose and schedule posts across your networks.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
        });
        if (error) throw error;
        toast.success("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back to Broadcast!");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-background bg-hero px-4 overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[140px]" />

      <div className="w-full max-w-md my-8">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3 group">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-gradient shadow-glow group-hover:scale-105 transition-transform">
            <Radio className="size-5 text-primary-foreground" />
          </span>
          <span className="text-2xl font-extrabold font-display tracking-tight text-foreground">
            Broadcast
          </span>
        </Link>

        <Card className="surface-card border-white/10 p-2 sm:p-4 shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[11px] font-semibold text-primary">
              <Sparkles className="size-3" />
              <span>Studio Authentication</span>
            </div>
            <CardTitle className="text-2xl font-bold font-display">
              {mode === "signin" ? "Welcome back" : "Create your studio"}
            </CardTitle>
            <CardDescription className="text-xs">
              {mode === "signin"
                ? "Sign in to access your social media composer and analytics."
                : "Start managing your social media networks in under a minute."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* OAuth Provider Button */}
            <Button
              onClick={onGoogle}
              variant="outline"
              className="w-full h-11 border-border/80 bg-secondary/40 hover:bg-secondary justify-center gap-3 text-sm font-semibold"
              disabled={loading}
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative text-center text-xs text-muted-foreground">
              <span className="bg-card px-3 relative z-10 font-medium">or continue with email</span>
              <div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border/60" />
            </div>

            {/* Email Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" /> Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-background/80 border-border focus:border-primary text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold flex items-center gap-1.5">
                  <Lock className="size-3.5 text-muted-foreground" /> Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-background/80 border-border focus:border-primary text-sm"
                />
              </div>

              <Button type="submit" variant="gradient" className="w-full h-11 text-base shadow-glow" disabled={loading}>
                {loading ? "Authenticating…" : mode === "signin" ? (
                  <span className="flex items-center justify-center gap-2">Sign in <ArrowRight className="size-4" /></span>
                ) : (
                  <span className="flex items-center justify-center gap-2">Create Studio Account <ArrowRight className="size-4" /></span>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              {mode === "signin" ? (
                <span>
                  Don't have a studio account yet?{" "}
                  <button
                    type="button"
                    className="font-bold text-primary hover:underline cursor-pointer"
                    onClick={() => setMode("signup")}
                  >
                    Sign up free
                  </button>
                </span>
              ) : (
                <span>
                  Already have a studio account?{" "}
                  <button
                    type="button"
                    className="font-bold text-primary hover:underline cursor-pointer"
                    onClick={() => setMode("signin")}
                  >
                    Sign in here
                  </button>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Database,
  Key,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import {
  getApiCredentials,
  saveApiCredentials,
  testSupabaseConnection,
  type ApiCredentials,
} from "@/lib/supabase-config";

interface SetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetupModal({ open, onOpenChange }: SetupModalProps) {
  const [creds, setCreds] = useState<ApiCredentials>(getApiCredentials());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (open) {
      setCreds(getApiCredentials());
      setTestResult(null);
    }
  }, [open]);

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(
        creds.supabaseUrl,
        creds.supabasePublishableKey,
      );
      setTestResult(res);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    saveApiCredentials(creds);
    toast.success("Settings & API keys saved successfully!");
    onOpenChange(false);
  }

  function handleCopySql() {
    navigator.clipboard.writeText(
      `-- Run this in Supabase SQL Editor:
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.social_platform AS ENUM ('linkedin', 'instagram');
CREATE TYPE public.post_status AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');
CREATE TYPE public.platform_result_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  display_name TEXT,
  connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  target_platforms public.social_platform[] NOT NULL DEFAULT '{}',
  status public.post_status NOT NULL DEFAULT 'DRAFT',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  status public.platform_result_status NOT NULL DEFAULT 'PENDING',
  external_id TEXT,
  error TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own profiles" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users manage own accounts" ON public.connected_accounts FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own posts" ON public.posts FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own results" ON public.post_results FOR ALL TO authenticated USING (auth.uid() = user_id);`,
    );
    setCopiedSql(true);
    toast.success("SQL Schema copied to clipboard!");
    setTimeout(() => setCopiedSql(false), 2500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface-card border-white/10 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" /> Studio Integration Center
          </div>
          <DialogTitle className="text-xl font-bold font-display">
            Supabase & Social API Configuration
          </DialogTitle>
          <DialogDescription className="text-xs">
            Connect your live Supabase backend and social developer credentials,
            or use Studio Sandbox mode.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="supabase" className="w-full mt-2">
          <TabsList className="grid grid-cols-3 bg-secondary/60">
            <TabsTrigger value="supabase" className="text-xs font-semibold">
              <Database className="size-3.5 mr-1.5" /> Supabase
            </TabsTrigger>
            <TabsTrigger value="social_keys" className="text-xs font-semibold">
              <Key className="size-3.5 mr-1.5" /> API Keys (LI / IG)
            </TabsTrigger>
            <TabsTrigger value="guide" className="text-xs font-semibold">
              <HelpCircle className="size-3.5 mr-1.5" /> Setup Guide
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SUPABASE */}
          <TabsContent value="supabase" className="space-y-4 pt-3">
            <div className="rounded-xl border border-border/70 bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Operational Mode
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Choose whether to use live Supabase or instant sandbox.
                  </p>
                </div>
                <div className="flex rounded-lg bg-secondary p-1">
                  <button
                    type="button"
                    onClick={() => setCreds({ ...creds, mode: "demo" })}
                    className={
                      "px-3 py-1 text-xs font-semibold rounded-md transition-all " +
                      (creds.mode === "demo"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    Sandbox Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreds({ ...creds, mode: "live" })}
                    className={
                      "px-3 py-1 text-xs font-semibold rounded-md transition-all " +
                      (creds.mode === "live"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    Live Supabase
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="supa-url" className="text-xs font-semibold">
                  Supabase Project URL
                </Label>
                <Input
                  id="supa-url"
                  placeholder="https://your-project-id.supabase.co"
                  value={creds.supabaseUrl}
                  onChange={(e) =>
                    setCreds({ ...creds, supabaseUrl: e.target.value.trim() })
                  }
                  className="bg-background/80 border-border text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supa-key" className="text-xs font-semibold">
                  Supabase Anon / Publishable Key
                </Label>
                <Input
                  id="supa-key"
                  type="password"
                  placeholder="sb_publishable_... or eyJhbGciOiJIUzI1NiIsInR5..."
                  value={creds.supabasePublishableKey}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      supabasePublishableKey: e.target.value.trim(),
                    })
                  }
                  className="bg-background/80 border-border text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={
                    testing ||
                    !creds.supabaseUrl ||
                    !creds.supabasePublishableKey
                  }
                  className="text-xs gap-2"
                >
                  <RefreshCw
                    className={`size-3.5 ${testing ? "animate-spin" : ""}`}
                  />
                  Test Connection
                </Button>

                {testResult && (
                  <div
                    className={`flex items-center gap-1.5 text-xs font-medium ${
                      testResult.ok ? "text-success" : "text-destructive"
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="size-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SOCIAL API KEYS */}
          <TabsContent value="social_keys" className="space-y-4 pt-3">
            {/* LinkedIn */}
            <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ background: "var(--brand-linkedin)" }}
                />
                LinkedIn API Credentials (Optional / Direct Token)
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your LinkedIn Developer app credentials or Member OAuth
                token for direct API publishing.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    Client ID
                  </Label>
                  <Input
                    placeholder="78xxxxxxx"
                    value={creds.linkedinClientId}
                    onChange={(e) =>
                      setCreds({
                        ...creds,
                        linkedinClientId: e.target.value.trim(),
                      })
                    }
                    className="bg-background/80 border-border text-xs font-mono h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    Client Secret
                  </Label>
                  <Input
                    type="password"
                    placeholder="WPL_AP1_..."
                    value={creds.linkedinClientSecret}
                    onChange={(e) =>
                      setCreds({
                        ...creds,
                        linkedinClientSecret: e.target.value.trim(),
                      })
                    }
                    className="bg-background/80 border-border text-xs font-mono h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  LinkedIn User Access Token (Bearer)
                </Label>
                <Input
                  type="password"
                  placeholder="AQV..."
                  value={creds.linkedinAccessToken}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      linkedinAccessToken: e.target.value.trim(),
                    })
                  }
                  className="bg-background/80 border-border text-xs font-mono h-9"
                />
              </div>
            </div>

            {/* Instagram */}
            <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ background: "var(--brand-instagram)" }}
                />
                Instagram / Meta Graph API Credentials (Optional)
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your Meta App ID, Instagram Business Account ID, and Page
                Access Token.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    Meta App ID
                  </Label>
                  <Input
                    placeholder="104829384920..."
                    value={creds.instagramAppId}
                    onChange={(e) =>
                      setCreds({
                        ...creds,
                        instagramAppId: e.target.value.trim(),
                      })
                    }
                    className="bg-background/80 border-border text-xs font-mono h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    Instagram Business Account ID
                  </Label>
                  <Input
                    placeholder="17841400000000000"
                    value={creds.instagramAccountId}
                    onChange={(e) =>
                      setCreds({
                        ...creds,
                        instagramAccountId: e.target.value.trim(),
                      })
                    }
                    className="bg-background/80 border-border text-xs font-mono h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Graph User / Page Access Token
                </Label>
                <Input
                  type="password"
                  placeholder="EAAB..."
                  value={creds.instagramAccessToken}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      instagramAccessToken: e.target.value.trim(),
                    })
                  }
                  className="bg-background/80 border-border text-xs font-mono h-9"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: STEP BY STEP GUIDE */}
          <TabsContent
            value="guide"
            className="space-y-4 pt-3 text-xs leading-relaxed"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">
                  1. Supabase Fast Connect
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopySql}
                  className="h-7 text-[11px] gap-1.5"
                >
                  {copiedSql ? (
                    <Check className="size-3 text-success" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  {copiedSql ? "Copied SQL" : "Copy Complete SQL"}
                </Button>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>
                  Create a free project at <strong>supabase.com</strong>.
                </li>
                <li>
                  Go to <strong>Project Settings → API</strong>. Copy your{" "}
                  <strong>Project URL</strong> and{" "}
                  <strong>anon / publishable</strong> key.
                </li>
                <li>
                  Go to the <strong>SQL Editor</strong> in Supabase, click{" "}
                  <em>New Query</em>, paste the copied SQL schema, and click{" "}
                  <strong>Run</strong>.
                </li>
                <li>
                  Paste your URL & Key into the Supabase tab in this dialog and
                  hit <strong>Test Connection</strong>.
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/30 p-4 space-y-2">
              <span className="font-bold text-foreground">
                2. LinkedIn API Keys Setup
              </span>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>
                  Visit <strong>developer.linkedin.com</strong> and create a
                  Developer App.
                </li>
                <li>
                  Link your LinkedIn Company Page or profile in the app
                  settings.
                </li>
                <li>
                  Under the <strong>Products</strong> tab, add{" "}
                  <em>Share on LinkedIn</em> and{" "}
                  <em>Sign In with LinkedIn using OpenID Connect</em>.
                </li>
                <li>
                  Copy the <strong>Client ID</strong> and{" "}
                  <strong>Client Secret</strong> from the <strong>Auth</strong>{" "}
                  tab.
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/30 p-4 space-y-2">
              <span className="font-bold text-foreground">
                3. Instagram Graph API Setup
              </span>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>
                  Ensure your Instagram account is switched to a{" "}
                  <strong>Professional / Creator</strong> account.
                </li>
                <li>
                  Link your Instagram Professional account to a Facebook Page.
                </li>
                <li>
                  Go to <strong>developers.facebook.com</strong> and create an
                  app of type <em>Business</em>.
                </li>
                <li>
                  Add the <strong>Instagram Graph API</strong> product to your
                  app.
                </li>
                <li>
                  Generate a Page Access Token with permissions:{" "}
                  <code>instagram_basic</code>,{" "}
                  <code>instagram_content_publish</code>,{" "}
                  <code>pages_show_list</code>.
                </li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-border/60 pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={handleSave}
            className="shadow-glow"
          >
            Save & Apply Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  Bot,
} from "lucide-react";
import {
  getApiCredentials,
  saveApiCredentials,
  testSupabaseConnection,
  COMPLETE_SQL_SCHEMA,
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
    toast.success("Settings & API credentials saved successfully!");
    onOpenChange(false);
  }

  function handleCopySql() {
    navigator.clipboard.writeText(COMPLETE_SQL_SCHEMA);
    setCopiedSql(true);
    toast.success("Complete SQL Schema copied to clipboard!");
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
            Connect your live Supabase database, LinkedIn OAuth, and Meta Graph
            API credentials, or use Studio Sandbox mode.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="supabase" className="w-full mt-2">
          <TabsList className="grid grid-cols-3 bg-secondary/60">
            <TabsTrigger value="supabase" className="text-xs font-semibold">
              <Database className="size-3.5 mr-1.5" /> Supabase
            </TabsTrigger>
            <TabsTrigger value="social_keys" className="text-xs font-semibold">
              <Key className="size-3.5 mr-1.5" /> API Credentials
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
                    Choose whether to use live Supabase or interactive studio
                    sandbox.
                  </p>
                </div>
                <div className="flex rounded-lg bg-secondary p-1">
                  <button
                    type="button"
                    onClick={() => setCreds({ ...creds, mode: "demo" })}
                    className={
                      "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer " +
                      (creds.mode === "demo"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    Studio Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreds({ ...creds, mode: "live" })}
                    className={
                      "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer " +
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
                LinkedIn API Credentials (Optional / Direct OAuth)
              </div>
              <p className="text-xs text-muted-foreground">
                Provide your LinkedIn Member OAuth Bearer token and Member URN
                for real API publishing. If omitted, the animated simulator will
                run.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    LinkedIn Member / Org URN
                  </Label>
                  <Input
                    placeholder="urn:li:person:12345678 or 12345678"
                    value={creds.linkedinMemberUrn}
                    onChange={(e) =>
                      setCreds({
                        ...creds,
                        linkedinMemberUrn: e.target.value.trim(),
                      })
                    }
                    className="bg-background/80 border-border text-xs font-mono h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    Client ID (Optional)
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
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  LinkedIn User Access Token (OAuth Bearer)
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
                Uses Meta Graph API v20.0 two-step container pipeline (/media
                then /media_publish).
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
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

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    Meta App ID (Optional)
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
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Page Access Token (Graph Bearer)
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

            {/* AI Generator Key */}
            <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Bot className="size-4 text-primary" />
                AI Smart Suggestions API Key (Optional)
              </div>
              <p className="text-xs text-muted-foreground">
                Enter an OpenAI (sk-...) or Google Gemini (AIzaSy...) API key
                for dynamic AI hook generations. If omitted, built-in
                algorithmic generation is used.
              </p>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  OpenAI or Google Gemini API Key
                </Label>
                <Input
                  type="password"
                  placeholder="sk-... or AIzaSy..."
                  value={creds.aiApiKey}
                  onChange={(e) =>
                    setCreds({
                      ...creds,
                      aiApiKey: e.target.value.trim(),
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
                  1. Turnkey Supabase Database Setup
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
                  <span>Copy Complete SQL</span>
                </Button>
              </div>
              <p className="text-muted-foreground">
                Copy the complete turnkey SQL script and paste it into your
                Supabase project's SQL Editor to automatically create tables
                (`profiles`, `connected_accounts`, `posts`, `post_results`,
                `post_templates`), RLS policies, and the public `post-media`
                storage bucket.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-2">
              <span className="font-bold text-foreground">
                2. LinkedIn API Credentials Setup
              </span>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>Create an application at developer.linkedin.com</li>
                <li>
                  Add the "Share on LinkedIn" and "Sign In with LinkedIn using
                  OpenID Connect" products.
                </li>
                <li>
                  Generate an OAuth 2.0 Access Token with `w_member_social`
                  permission.
                </li>
                <li>
                  Retrieve your Member URN (or query
                  `https://api.linkedin.com/v2/userinfo` to find your `sub` ID).
                </li>
                <li>
                  Paste your Bearer Token and Member URN into the API
                  Credentials tab.
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-2">
              <span className="font-bold text-foreground">
                3. Meta / Instagram Graph API Setup
              </span>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>
                  In Meta for Developers (developers.facebook.com), create a
                  Business App.
                </li>
                <li>Add the Instagram Graph API product.</li>
                <li>
                  Connect your Instagram Business or Creator account to a
                  Facebook Page.
                </li>
                <li>
                  In the Graph API Explorer, generate a Page Access Token with
                  `instagram_basic` and `instagram_content_publish` permissions.
                </li>
                <li>
                  Query `GET /me/accounts` to retrieve your connected
                  `instagram_business_account` ID.
                </li>
                <li>
                  Paste the Page Access Token and Instagram Business Account ID
                  into the API Credentials tab.
                </li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="gradient"
            size="sm"
            onClick={handleSave}
            className="shadow-glow"
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

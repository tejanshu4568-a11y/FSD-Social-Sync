import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState, useEffect } from "react";
import {
  getConnectedAccounts,
  disconnectAccount as removeAccount,
  getLinkedInOAuthUrl,
  getInstagramOAuthUrl,
  type ConnectedAccountInfo,
} from "@/lib/oauth";
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
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Plug,
  Sparkles,
  Link2,
  Unlink,
  ExternalLink,
  ShieldCheck,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { SetupModal } from "@/components/setup-modal";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Connected Accounts · Broadcast" }] }),
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm font-semibold">
          Loading Connected Accounts…
        </div>
      }
    >
      <AccountsInner />
    </Suspense>
  ),
});

const SETUP_DESCRIPTIONS: Record<Platform, string> = {
  linkedin:
    "Authorize your LinkedIn profile or Company Page to sync professional thought leadership and metric milestone posts directly from Broadcast.",
  instagram:
    "Authorize your Instagram Business or Creator account to schedule high-resolution visual storytelling containers.",
};

function AccountsInner() {
  const [accounts, setAccounts] = useState<
    Record<Platform, ConnectedAccountInfo>
  >({
    linkedin: {
      platform: "linkedin",
      displayName: "LinkedIn Profile",
      connected: false,
    },
    instagram: {
      platform: "instagram",
      displayName: "Instagram Account",
      connected: false,
    },
  });
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  async function loadAccounts() {
    setLoading(true);
    try {
      const data = await getConnectedAccounts();
      setAccounts(data);
    } catch (e) {
      console.warn("Failed fetching accounts:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
    const onUpdate = () => loadAccounts();
    window.addEventListener("social_sync_accounts_updated", onUpdate);
    window.addEventListener("social_sync_config_updated", onUpdate);
    return () => {
      window.removeEventListener("social_sync_accounts_updated", onUpdate);
      window.removeEventListener("social_sync_config_updated", onUpdate);
    };
  }, []);

  function handleConnectOAuth(platform: Platform) {
    if (platform === "linkedin") {
      const url = getLinkedInOAuthUrl();
      toast.info("Redirecting to LinkedIn secure authorization…");
      window.location.href = url;
    } else {
      const url = getInstagramOAuthUrl();
      toast.info("Redirecting to Meta secure authorization…");
      window.location.href = url;
    }
  }

  async function handleDisconnect(platform: Platform) {
    try {
      await removeAccount(platform);
      toast.success(`${PLATFORM_META[platform].label} account disconnected`);
      await loadAccounts();
    } catch (e: any) {
      toast.error(e?.message || "Failed disconnecting account");
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" /> 1-Click Social Network
            Integrations
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight">
            Connected Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect your personal or brand social channels with a single click.
            Zero developer keys required.
          </p>
        </div>
      </header>

      {/* Grid of Platform Connect Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {PLATFORMS.map((p) => {
          const meta = PLATFORM_META[p];
          const info = accounts[p];
          const isConnected = info?.connected;

          return (
            <Card
              key={p}
              className={`surface-card p-6 flex flex-col justify-between transition-all duration-200 border-2 ${
                isConnected
                  ? "border-success/30 bg-success/5 shadow-glow"
                  : "border-border/70 hover:border-primary/40"
              }`}
            >
              <div>
                <CardHeader className="p-0 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-11 place-items-center rounded-2xl text-white font-black text-sm shadow-sm"
                        style={{ backgroundColor: meta.colorVar }}
                      >
                        {p === "linkedin" ? "in" : "IG"}
                      </span>
                      <div>
                        <CardTitle className="text-lg font-bold">
                          {meta.label}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {isConnected ? info.displayName : "Not connected"}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
                        isConnected
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-secondary text-muted-foreground border-border/60"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isConnected
                            ? "bg-success animate-pulse"
                            : "bg-muted-foreground"
                        }`}
                      />
                      {isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  <CardDescription className="text-xs mt-3 text-muted-foreground leading-relaxed">
                    {SETUP_DESCRIPTIONS[p]}
                  </CardDescription>
                </CardHeader>

                <div className="my-4 rounded-xl border border-border/50 bg-secondary/30 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Direct Publishing:</span>
                    <span className="font-semibold text-foreground">
                      {isConnected ? "Enabled" : "Waiting for auth"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Character Limit:</span>
                    <span className="font-mono text-foreground">
                      {meta.charLimit.toLocaleString()} chars
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Media Requirement:</span>
                    <span className="text-foreground">
                      {meta.requiresMedia ? "Image required" : "Text or Media"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                {isConnected ? (
                  <Button
                    variant="outline"
                    className="w-full text-xs border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive/40 gap-2 cursor-pointer"
                    onClick={() => handleDisconnect(p)}
                  >
                    <Unlink className="size-3.5" /> Disconnect {meta.label}
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    className="w-full text-xs shadow-glow gap-2 cursor-pointer h-10 font-bold"
                    onClick={() => handleConnectOAuth(p)}
                  >
                    <Link2 className="size-4" /> Connect with {meta.label}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Security & Consumer Notice */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 flex items-start gap-3.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-foreground">
            Official Platform Authorization
          </div>
          <div>
            Broadcast uses official, secure OAuth 2.0 protocols. We never see or
            store your LinkedIn or Instagram password. You can revoke access at
            any time directly from your social account settings.
          </div>
        </div>
      </div>

      {/* Advanced / Developer BYOK Section (Demoted & Tucked Away) */}
      <div className="pt-4 border-t border-border/40">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Settings className="size-3.5" />
          <span>Advanced / Custom Developer Credentials (BYOK)</span>
          {showAdvanced ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 rounded-xl bg-secondary/30 border border-border/60 text-xs space-y-3">
            <p className="text-muted-foreground">
              Are you self-hosting or want to use your own custom LinkedIn /
              Meta Developer App keys instead of 1-click OAuth?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSetupModalOpen(true)}
              className="text-xs gap-1.5"
            >
              <Settings className="size-3.5 text-primary" />
              <span>Open Developer Configuration Modal</span>
            </Button>
          </div>
        )}
      </div>

      <SetupModal open={setupModalOpen} onOpenChange={setSetupModalOpen} />
    </div>
  );
}

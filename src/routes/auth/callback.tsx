import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { saveConnectedAccount } from "@/lib/oauth";
import { type Platform } from "@/lib/platform-constraints";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

const callbackSearchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: callbackSearchSchema,
  head: () => ({ meta: [{ title: "Connecting Social Account · Broadcast" }] }),
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [platformName, setPlatformName] = useState("Social Network");

  useEffect(() => {
    async function processCallback() {
      if (search.error) {
        setStatus("error");
        setErrorMessage(search.error_description || search.error);
        return;
      }

      if (!search.code) {
        setStatus("error");
        setErrorMessage("No authorization code returned from social network.");
        return;
      }

      try {
        let platform: Platform = "linkedin";
        if (search.state) {
          try {
            const parsed = JSON.parse(decodeURIComponent(search.state));
            if (parsed.platform === "instagram") platform = "instagram";
          } catch (e) {
            if (search.state.includes("instagram")) platform = "instagram";
          }
        }

        const label = platform === "linkedin" ? "LinkedIn" : "Instagram";
        setPlatformName(label);

        // Record account connection
        await saveConnectedAccount({
          platform,
          displayName:
            platform === "linkedin"
              ? "LinkedIn Account (Authorized)"
              : "@instagram_creator",
          connected: true,
          connectedAt: new Date().toISOString(),
        });

        setStatus("success");
        toast.success(`Successfully connected your ${label} account!`);

        // Redirect back to accounts overview in 1.5 seconds
        setTimeout(() => {
          navigate({ to: "/accounts" });
        }, 1200);
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(
          err?.message || "Failed to complete account authorization.",
        );
      }
    }

    processCallback();
  }, [search, navigate]);

  return (
    <div className="min-h-screen bg-background bg-hero grid place-items-center px-4">
      <Card className="surface-card border-white/10 max-w-md w-full p-6 text-center shadow-2xl">
        <CardContent className="space-y-4 pt-4">
          {status === "processing" && (
            <>
              <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary grid place-items-center mx-auto">
                <RefreshCw className="size-7 animate-spin" />
              </div>
              <h2 className="text-xl font-bold font-display">
                Authorizing Account…
              </h2>
              <p className="text-xs text-muted-foreground">
                Finalizing secure OAuth handshake with {platformName}. You will
                be redirected shortly.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="size-14 rounded-2xl bg-success/15 border border-success/30 text-success grid place-items-center mx-auto shadow-glow">
                <CheckCircle2 className="size-7" />
              </div>
              <h2 className="text-xl font-bold font-display text-foreground">
                {platformName} Connected!
              </h2>
              <p className="text-xs text-muted-foreground">
                Your profile is now linked to Broadcast. Returning to your
                studio…
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="size-14 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive grid place-items-center mx-auto">
                <AlertCircle className="size-7" />
              </div>
              <h2 className="text-xl font-bold font-display text-destructive">
                Authorization Failed
              </h2>
              <p className="text-xs text-muted-foreground">{errorMessage}</p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/accounts" })}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer"
                >
                  Return to Accounts
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listConnectedAccounts,
  stubConnectAccount,
  disconnectAccount,
} from "@/lib/accounts.functions";
import { PLATFORM_META, PLATFORMS, type Platform } from "@/lib/platform-constraints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Plug } from "lucide-react";
import { toast } from "sonner";

const acctsQO = queryOptions({ queryKey: ["accounts"], queryFn: () => listConnectedAccounts() });

export const Route = createFileRoute("/_authenticated/accounts")({
  loader: ({ context }) => context.queryClient.ensureQueryData(acctsQO),
  head: () => ({ meta: [{ title: "Accounts · Broadcast" }] }),
  component: () => (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <Inner />
    </Suspense>
  ),
});

const SETUP_NOTES: Record<Platform, string> = {
  linkedin:
    "Connect your LinkedIn profile or company page to publish directly from Broadcast.",
  twitter:
    "Connect your X (Twitter) account to publish tweets and threads.",
  instagram:
    "Connect your Instagram Business or Creator account to schedule posts.",
};

function Inner() {
  const qc = useQueryClient();
  const { data: accounts } = useSuspenseQuery(acctsQO);

  const [dialogFor, setDialogFor] = useState<Platform | null>(null);
  const [handle, setHandle] = useState("");

  const connect = useMutation({
    mutationFn: (p: { platform: Platform; displayName: string }) =>
      stubConnectAccount({ data: { platform: p.platform, displayName: p.displayName } }),
    onSuccess: () => {
      toast.success("Connected");
      setDialogFor(null);
      setHandle("");
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disc = useMutation({
    mutationFn: (platform: Platform) => disconnectAccount({ data: { platform } }),
    onSuccess: () => {
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Connect the networks you publish to.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {PLATFORMS.map((p) => {
          const meta = PLATFORM_META[p];
          const acct = accounts.find((a) => a.platform === p);
          const connected = !!acct?.connected;
          return (
            <Card key={p} className="surface-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-3 rounded-full"
                    style={{ background: meta.colorVar }}
                  />
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                </div>
                <CardDescription>{meta.charLimit} character limit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {connected ? (
                    <>
                      <CheckCircle2 className="size-4 text-success" />
                      <span className="text-foreground">{acct?.display_name ?? "Connected"}</span>
                    </>
                  ) : (
                    <>
                      <Plug className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Not connected</span>
                    </>
                  )}
                </div>
                {connected ? (
                  <Button variant="outline" className="w-full" onClick={() => disc.mutate(p)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => setDialogFor(p)}>
                    Connect {meta.label}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!dialogFor} onOpenChange={(o) => !o && setDialogFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {dialogFor ? PLATFORM_META[dialogFor].label : ""}</DialogTitle>
            <DialogDescription>{dialogFor ? SETUP_NOTES[dialogFor] : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="handle">Display name / handle</Label>
            <Input
              id="handle"
              placeholder="@yourhandle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground">
              This is a label to identify your connected account.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={!handle.trim() || connect.isPending}
              onClick={() =>
                dialogFor && connect.mutate({ platform: dialogFor, displayName: handle.trim() })
              }
            >
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

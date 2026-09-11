import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
  useSuspenseQuery,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listConnectedAccounts,
  stubConnectAccount,
  disconnectAccount,
} from "@/lib/accounts.functions";
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
import {
  CheckCircle2,
  Plug,
  Sparkles,
  Link2,
  Unlink,
  Settings,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { SetupModal } from "@/components/setup-modal";

const acctsQO = queryOptions({
  queryKey: ["accounts"],
  queryFn: () => listConnectedAccounts(),
});

export const Route = createFileRoute("/_authenticated/accounts")({
  loader: ({ context }) => context.queryClient.ensureQueryData(acctsQO),
  head: () => ({ meta: [{ title: "Connected Accounts · Broadcast" }] }),
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm font-semibold">
          Loading Connected Accounts…
        </div>
      }
    >
      <Inner />
    </Suspense>
  ),
});

const SETUP_NOTES: Record<Platform, string> = {
  linkedin:
    "Connect your LinkedIn profile or Company Page to sync professional posts directly from Broadcast.",
  instagram:
    "Connect your Instagram Business or Creator profile to schedule visual posts and captions.",
};

function Inner() {
  const qc = useQueryClient();
  const { data: accounts } = useSuspenseQuery(acctsQO);

  const [dialogFor, setDialogFor] = useState<Platform | null>(null);
  const [handle, setHandle] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);

  const connect = useMutation({
    mutationFn: (p: { platform: Platform; displayName: string }) =>
      stubConnectAccount({
        data: { platform: p.platform, displayName: p.displayName },
      }),
    onSuccess: () => {
      toast.success("Social network account connected!");
      setDialogFor(null);
      setHandle("");
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disc = useMutation({
    mutationFn: (platform: Platform) =>
      disconnectAccount({ data: { platform } }),
    onSuccess: () => {
      toast.success("Account disconnected");
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" /> Studio Integration Center
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight">
            Connected Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage authorized profiles across LinkedIn and Instagram.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSetupOpen(true)}
          className="text-xs gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Key className="size-3.5" /> Configure Developer API Keys
        </Button>
      </header>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        {PLATFORMS.map((p) => {
          const meta = PLATFORM_META[p];
          const acct = accounts.find((a) => a.platform === p);
          const connected = !!acct?.connected;
          return (
            <Card
              key={p}
              className="surface-card surface-card-hover p-6 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 place-items-center rounded-xl text-white font-bold text-sm shadow-md"
                      style={{ background: meta.colorVar }}
                    >
                      {meta.label[0]}
                    </span>
                    <div>
                      <CardTitle className="text-base font-bold">
                        {meta.label}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {meta.charLimit} max characters
                      </CardDescription>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-3 flex items-center gap-2 text-xs">
                  {connected ? (
                    <>
                      <CheckCircle2 className="size-4 text-success shrink-0" />
                      <div className="truncate min-w-0">
                        <span className="font-semibold text-foreground">
                          {acct?.display_name ?? "Connected Profile"}
                        </span>
                        <div className="text-[10px] text-success">
                          Active & Ready
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Plug className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">
                        Not connected yet
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2">
                {connected ? (
                  <Button
                    variant="outline"
                    className="w-full text-xs border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive/40"
                    onClick={() => disc.mutate(p)}
                  >
                    <Unlink className="size-3.5" /> Disconnect Platform
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    className="w-full text-xs shadow-glow"
                    onClick={() => setDialogFor(p)}
                  >
                    <Link2 className="size-3.5" /> Connect {meta.label}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!dialogFor} onOpenChange={(o) => !o && setDialogFor(null)}>
        <DialogContent className="surface-card border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Connect {dialogFor ? PLATFORM_META[dialogFor].label : ""} Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              {dialogFor ? SETUP_NOTES[dialogFor] : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="handle" className="text-xs font-semibold">
              Profile Display Name or Handle
            </Label>
            <Input
              id="handle"
              placeholder="@yourcompany"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              maxLength={80}
              className="bg-background/80 border-border text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              This identifier will be displayed in your studio dashboard for
              content targeting.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogFor(null)}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              size="sm"
              disabled={!handle.trim() || connect.isPending}
              onClick={() =>
                dialogFor &&
                connect.mutate({
                  platform: dialogFor,
                  displayName: handle.trim(),
                })
              }
            >
              Confirm Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SetupModal open={setupOpen} onOpenChange={setSetupOpen} />
    </div>
  );
}

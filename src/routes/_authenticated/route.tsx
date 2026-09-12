import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Radio,
  LayoutDashboard,
  PencilLine,
  CalendarDays,
  Link2,
  LogOut,
  User,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/composer", label: "Composer", icon: PencilLine },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/accounts", label: "Accounts", icon: Link2 },
] as const;

function AuthedShell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>(user.email ?? "");

  useEffect(() => setEmail(user.email ?? ""), [user.email]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.info("Signed out of Broadcast");
    navigate({ to: "/auth", replace: true });
  }

  const userInitial = email ? email[0].toUpperCase() : "U";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/90 text-sidebar-foreground backdrop-blur-xl md:flex sticky top-0 h-screen">
        <div className="flex h-20 items-center justify-between px-6 border-b border-sidebar-border/60">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient shadow-glow">
              <Radio className="size-5 text-primary-foreground" />
            </span>
            <div>
              <span className="text-lg font-black tracking-tight font-display text-foreground">
                Broadcast
              </span>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                <Sparkles className="size-2.5" /> Studio active
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Menu Navigation
          </div>
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={
                  "flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 " +
                  (active
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-glow"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground")
                }
              >
                <Icon
                  className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User profile section */}
        <div className="border-t border-sidebar-border/60 p-4 bg-secondary/20">
          <div className="flex items-center gap-3 px-2 py-1 mb-3">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-sm shadow-sm">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-foreground">
                {email}
              </div>
              <div className="text-[10px] text-muted-foreground">
                LinkedIn & Instagram Pro
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-border/60 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/40"
            onClick={signOut}
          >
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-lg md:hidden sticky top-0 z-40">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-bold font-display text-lg"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-brand-gradient">
              <Radio className="size-4 text-primary-foreground" />
            </span>
            Broadcast
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="sticky bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={
                  "flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors " +
                  (active ? "text-primary" : "text-muted-foreground")
                }
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

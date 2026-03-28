/**
 * SPLayout — Service Provider Portal Layout
 *
 * Clean, focused layout for service providers.
 * Designed for job management: incoming jobs, accept/reject, in-progress, complete.
 * Role-gated: SERVICE_PROVIDER role required.
 */
import { type ReactNode, useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Briefcase, LayoutDashboard, LogOut,
  ChevronRight, Loader2, AlertTriangle, Clock,
  Inbox, SendHorizonal, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { DisplayPreferencesDrawer } from "@/components/DisplayPreferencesDrawer";
import { LOGO_WHITE_URL } from "@/const";

const SP_ROLES = ["SERVICE_PROVIDER", "SP_ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"];

interface SPLayoutProps {
  children: ReactNode;
}

function NavItem({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}) {
  const [location] = useLocation();
  const isActive = location === href || location.startsWith(href + "/");
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm font-medium ${
          isActive
            ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge className="bg-teal-500 text-black text-xs px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </Badge>
        )}
      </div>
    </Link>
  );
}

export default function SPLayout({ children }: SPLayoutProps) {
  const { user, loading: authLoading, logout } = useAuth();
  const { activeRole } = useActiveRole();
  const [, navigate] = useLocation();
  const [incomingCount, setIncomingCount] = useState(0);

  const hasAccess = activeRole && SP_ROLES.includes(activeRole.roleId);

  // Get incoming dispatched jobs count
  // scopeId = SP entity ID; null for SUPER_ADMIN (server returns all)
  const providerId = activeRole?.scopeId ?? undefined;
  const { data: incomingJobs } = trpc.requests.listSpJobs.useQuery(
    { providerId, status: "DISPATCHED" },
    { enabled: !!hasAccess, refetchInterval: 15_000 }
  );

  useEffect(() => {
    setIncomingCount(incomingJobs?.items?.length ?? 0);
  }, [incomingJobs]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/admin/login");
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-6">
          <AlertTriangle className="w-12 h-12 text-teal-400 mx-auto" />
          <h2 className="text-xl font-semibold text-zinc-100">Access Restricted</h2>
          <p className="text-zinc-400 text-sm">
            The Service Provider Portal requires the <strong className="text-teal-400">Service Provider</strong> role.
            Please switch to an appropriate role.
          </p>
          <Button variant="outline" onClick={() => navigate("/admin/role-switch")} className="w-full">
            Switch Role
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <img
              src={LOGO_WHITE_URL}
              alt="Peppr Around"
              className="w-7 h-7 rounded-md object-contain"
              
            />
            <div>
              <p className="text-zinc-100 font-semibold text-sm leading-tight">Provider Portal</p>
              <p className="text-zinc-500 text-xs leading-tight truncate max-w-[120px]">
                {activeRole?.scopeLabel ?? "Service Provider"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <NavItem href="/sp" icon={LayoutDashboard} label="Overview" />
          <NavItem href="/sp/jobs" icon={Briefcase} label="Job Queue" badge={incomingCount} />
          <NavItem href="/sp/inbound" icon={Inbox} label="Inbound Tickets" />
          <NavItem href="/sp/outbound" icon={SendHorizonal} label="Outbound Queue" />
          <NavItem href="/sp/operators" icon={Users} label="Operators" />
          <NavItem href="/sp/history" icon={Clock} label="History" />
        </nav>

        <Separator className="bg-zinc-800" />

        {/* User */}
        <div className="px-3 py-3 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
              <span className="text-teal-400 text-xs font-semibold">
                {(user as any)?.name?.charAt(0)?.toUpperCase() ?? "S"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-200 text-xs font-medium truncate">{(user as any)?.name ?? "Provider"}</p>
              <p className="text-zinc-500 text-xs truncate">{activeRole?.roleName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-500/10 text-xs gap-2"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-zinc-500 hover:text-zinc-300 text-xs gap-2"
            onClick={() => navigate("/admin/role-switch")}
          >
            <ChevronRight className="w-3.5 h-3.5" />
            Switch role
          </Button>
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-zinc-600 text-xs">Display</span>
            <DisplayPreferencesDrawer compact />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

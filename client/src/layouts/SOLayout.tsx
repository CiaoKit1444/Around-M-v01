/**
 * SOLayout — Service Operator Portal Layout
 *
 * Minimal layout for field staff (Service Operators).
 * Shows their assigned jobs and allows status updates.
 */
import { type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Briefcase, LogOut, Loader2, AlertTriangle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useActiveRole } from "@/hooks/useActiveRole";
import { DisplayPreferencesDrawer } from "@/components/DisplayPreferencesDrawer";
import { LOGO_WHITE_URL } from "@/const";

const SO_ROLES = ["SERVICE_OPERATOR", "SUPER_ADMIN", "SYSTEM_ADMIN"];

interface SOLayoutProps {
  children: ReactNode;
}

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  const [location] = useLocation();
  const isActive = location === href || location.startsWith(href + "/");
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm font-medium ${
          isActive
            ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
      </div>
    </Link>
  );
}

export default function SOLayout({ children }: SOLayoutProps) {
  const { user, loading: authLoading, logout } = useAuth();
  const { activeRole } = useActiveRole();
  const [, navigate] = useLocation();

  const hasAccess = activeRole && SO_ROLES.includes(activeRole.roleId);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
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
          <AlertTriangle className="w-12 h-12 text-indigo-400 mx-auto" />
          <h2 className="text-xl font-semibold text-zinc-100">Access Restricted</h2>
          <p className="text-zinc-400 text-sm">
            The Service Operator Portal requires the{" "}
            <strong className="text-indigo-400">Service Operator</strong> role.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/role-switch")}
            className="w-full"
          >
            Switch Role
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <aside className="w-52 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="px-4 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <img
              src={LOGO_WHITE_URL}
              alt="Peppr Around"
              className="w-7 h-7 rounded-md object-contain"
              
            />
            <div>
              <p className="text-zinc-100 font-semibold text-sm leading-tight">Operator Portal</p>
              <p className="text-zinc-500 text-xs leading-tight truncate max-w-[110px]">
                {user?.name ?? "Service Operator"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <NavItem href="/so/jobs" icon={Briefcase} label="My Jobs" />
          <NavItem href="/so/history" icon={ListChecks} label="History" />
        </nav>

        <Separator className="bg-zinc-800" />

        <div className="px-3 py-3 space-y-2">
          <div className="px-3 py-2">
            <p className="text-zinc-100 text-sm font-medium truncate">{user?.name}</p>
            <p className="text-zinc-500 text-xs truncate">{(user as any)?.email ?? ""}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-zinc-600 text-xs">Display</span>
            <DisplayPreferencesDrawer compact />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

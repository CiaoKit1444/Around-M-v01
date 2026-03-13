/**
 * UserManagementPage — Multi-Tenant User & Role Management
 *
 * Super-admin UI for:
 *   1. Viewing all users with their role assignments
 *   2. Creating new users and adding them to the SSO allowlist
 *   3. Assigning / revoking roles across partners and properties
 *   4. Managing the SSO allowlist (who can log in via Google OAuth)
 *
 * Design: Precision Studio — dark sidebar, tabbed layout, role cards.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Hotel,
  Globe,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { ROLE_ICONS, ROLE_COLORS } from "@/hooks/useActiveRole";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RoleDef {
  roleId: string;
  name: string;
  scopeType: "GLOBAL" | "PARTNER" | "PROPERTY";
  description: string;
}

interface UserRow {
  userId: string;
  email: string;
  fullName: string;
  status: string;
  roles: Array<{
    roleId: string;
    roleName: string;
    scopeType: string;
    scopeLabel: string | null;
  }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SCOPE_ICONS = {
  GLOBAL:   <Globe className="w-3 h-3" />,
  PARTNER:  <Building2 className="w-3 h-3" />,
  PROPERTY: <Hotel className="w-3 h-3" />,
};

function RolePill({ roleId, label }: { roleId: string; label: string }) {
  const colors = ROLE_COLORS[roleId] ?? ROLE_COLORS["FRONT_DESK"];
  const icon = ROLE_ICONS[roleId] ?? "👤";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border",
      colors.border,
      "bg-zinc-900 text-zinc-300"
    )}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

// ── Add Role Dialog ────────────────────────────────────────────────────────────

function AddRoleDialog({
  userId,
  roleDefs,
  open,
  onClose,
}: {
  userId: string;
  roleDefs: RoleDef[];
  open: boolean;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState("");
  const [scopeType, setScopeType] = useState<"GLOBAL" | "PARTNER" | "PROPERTY">("GLOBAL");
  const [scopeId, setScopeId] = useState("");

  const utils = trpc.useUtils();
  const { data: partnersData } = trpc.rbac.listUsers.useQuery(undefined, { enabled: false });
  const assignRole = trpc.rbac.assignRole.useMutation({
    onSuccess: () => {
      toast.success("Role assigned successfully");
      utils.rbac.listUsers.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedRoleDef = roleDefs.find((r) => r.roleId === selectedRole);

  const handleRoleChange = (val: string) => {
    setSelectedRole(val);
    const def = roleDefs.find((r) => r.roleId === val);
    if (def) setScopeType(def.scopeType as "GLOBAL" | "PARTNER" | "PROPERTY");
  };

  const handleSubmit = () => {
    if (!selectedRole) { toast.error("Select a role"); return; }
    if (scopeType !== "GLOBAL" && !scopeId.trim()) { toast.error("Scope ID is required for this role"); return; }
    assignRole.mutate({
      userId,
      roleId: selectedRole,
      scopeType,
      scopeId: scopeType === "GLOBAL" ? null : scopeId.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Assign Role</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Role</Label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {roleDefs.map((r) => (
                  <SelectItem key={r.roleId} value={r.roleId} className="text-zinc-100">
                    <span className="flex items-center gap-2">
                      <span>{ROLE_ICONS[r.roleId] ?? "👤"}</span>
                      <span>{r.name}</span>
                      <span className="text-zinc-500 text-xs">— {r.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRoleDef && scopeType !== "GLOBAL" && (
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">
                {scopeType === "PARTNER" ? "Partner ID" : "Property ID"}
              </Label>
              <Input
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                placeholder={scopeType === "PARTNER" ? "e.g. partner-uuid" : "e.g. property-uuid"}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
              <p className="text-zinc-500 text-xs mt-1">
                Enter the {scopeType.toLowerCase()} ID from the {scopeType === "PARTNER" ? "Partners" : "Properties"} list.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={assignRole.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black"
          >
            {assignRole.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Assign Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add SSO User Dialog ────────────────────────────────────────────────────────

function AddSsoUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"google" | "email">("google");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const addSso = trpc.rbac.addSsoAllowlist.useMutation({
    onSuccess: () => {
      toast.success(`${email} added to SSO allowlist`);
      utils.rbac.ssoAllowlist.invalidate();
      setEmail(""); setName(""); setNotes("");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add User to SSO Allowlist</DialogTitle>
        </DialogHeader>
        <p className="text-zinc-400 text-sm -mt-2">
          This allows the credential to log in via SSO. Assign roles after they first sign in.
        </p>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Full Name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Auth Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as "google" | "email")}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="google" className="text-zinc-100">Google OAuth (SSO)</SelectItem>
                <SelectItem value="email" className="text-zinc-100">Email / Password</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Front desk staff at The Sukhothai"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Cancel
          </Button>
          <Button
            onClick={() => addSso.mutate({ email, provider, fullName: name || undefined, notes: notes || undefined })}
            disabled={!email || addSso.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black"
          >
            {addSso.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Add to Allowlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── User Row ───────────────────────────────────────────────────────────────────

function UserRowExpanded({ user, roleDefs }: { user: UserRow; roleDefs: RoleDef[] }) {
  const [expanded, setExpanded] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const utils = trpc.useUtils();

  const revokeRole = trpc.rbac.revokeRole.useMutation({
    onSuccess: () => {
      toast.success("Role revoked");
      utils.rbac.listUsers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-zinc-800/50 border-zinc-800"
        onClick={() => setExpanded((e) => !e)}
      >
        <TableCell className="w-8">
          {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
              {(user.fullName || user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">{user.fullName || "—"}</p>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {user.roles.slice(0, 3).map((r, i) => (
              <RolePill key={i} roleId={r.roleId} label={r.roleName} />
            ))}
            {user.roles.length > 3 && (
              <span className="text-xs text-zinc-500">+{user.roles.length - 3} more</span>
            )}
            {user.roles.length === 0 && (
              <span className="text-xs text-zinc-600 italic">No roles</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge
            className={cn(
              "text-xs border-0",
              user.status === "ACTIVE" ? "bg-emerald-900 text-emerald-300" : "bg-zinc-800 text-zinc-400"
            )}
          >
            {user.status}
          </Badge>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="border-zinc-800 bg-zinc-900/50">
          <TableCell colSpan={4} className="py-3 px-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Role Assignments</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={(e) => { e.stopPropagation(); setAddRoleOpen(true); }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Role
                </Button>
              </div>

              {user.roles.length === 0 ? (
                <p className="text-zinc-600 text-sm italic">No roles assigned. Click "Add Role" to assign one.</p>
              ) : (
                <div className="space-y-1.5">
                  {user.roles.map((r, i) => {
                    const colors = ROLE_COLORS[r.roleId] ?? ROLE_COLORS["FRONT_DESK"];
                    const icon = ROLE_ICONS[r.roleId] ?? "👤";
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg border",
                          colors.border,
                          "bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span>{icon}</span>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{r.roleName}</p>
                            <p className="text-xs text-zinc-500">
                              {r.scopeType}{r.scopeLabel ? ` · ${r.scopeLabel}` : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400 hover:bg-red-950"
                          onClick={(e) => {
                            e.stopPropagation();
                            revokeRole.mutate({ userId: user.userId, roleId: r.roleId });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <AddRoleDialog
              userId={user.userId}
              roleDefs={roleDefs}
              open={addRoleOpen}
              onClose={() => setAddRoleOpen(false)}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const [addSsoOpen, setAddSsoOpen] = useState(false);

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = trpc.rbac.listUsers.useQuery();
  const { data: ssoData, isLoading: ssoLoading, refetch: refetchSso } = trpc.rbac.ssoAllowlist.useQuery();
  const { data: rolesData } = trpc.rbac.roleDefinitions.useQuery();

  const users = (usersData?.users ?? []) as UserRow[];
  const ssoEntries = ssoData?.entries ?? [];
  const roleDefs = (rolesData?.roles ?? []) as RoleDef[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage platform users, role assignments, and SSO access control.
          </p>
        </div>
        <Button
          onClick={() => setAddSsoOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-medium"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.reduce((acc, u) => acc + u.roles.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Role Assignments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{ssoEntries.length}</p>
              <p className="text-xs text-muted-foreground">SSO Allowlist</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="bg-muted border-border">
          <TabsTrigger value="users" className="data-[state=active]:bg-background">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="sso" className="data-[state=active]:bg-background">
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            SSO Allowlist
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-background">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Role Definitions
          </TabsTrigger>
        </TabsList>

        {/* Users & Roles Tab */}
        <TabsContent value="users" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">All Users</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => refetchUsers()}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No users found.</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    The FastAPI /v1/admin/users endpoint may not be available yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-8" />
                      <TableHead className="text-xs text-muted-foreground font-medium">User</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">Roles</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <UserRowExpanded key={u.userId} user={u} roleDefs={roleDefs} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SSO Allowlist Tab */}
        <TabsContent value="sso" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">SSO Allowlist</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only emails on this list can authenticate via Google OAuth or email/password.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => refetchSso()}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-black"
                  onClick={() => setAddSsoOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Email
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {ssoLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Loading allowlist...
                </div>
              ) : ssoEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Mail className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No SSO entries yet.</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    Add emails to allow users to authenticate via Google OAuth.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs text-muted-foreground font-medium">Email</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">Provider</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ssoEntries as Record<string, unknown>[]).map((entry, i: number) => (
                      <TableRow key={i} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                              {String(entry.email ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm text-foreground">{String(entry.email ?? "")}</p>
                              {Boolean(entry.fullName) && (
                                <p className="text-xs text-muted-foreground">{String(entry.fullName as string)}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="text-xs bg-blue-900 text-blue-300 border-0">
                            {String(entry.provider ?? "google")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {String(entry.notes ?? "—")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Definitions Tab */}
        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleDefs.map((role) => {
              const colors = ROLE_COLORS[role.roleId] ?? ROLE_COLORS["FRONT_DESK"];
              const icon = ROLE_ICONS[role.roleId] ?? "👤";
              return (
                <Card
                  key={role.roleId}
                  className={cn("border", colors.border, "bg-card")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm">{role.name}</h3>
                          <Badge className={cn("text-xs border-0 text-white", colors.badge)}>
                            {role.scopeType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add SSO User Dialog */}
      <AddSsoUserDialog open={addSsoOpen} onClose={() => setAddSsoOpen(false)} />
    </div>
  );
}

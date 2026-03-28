/**
 * Navigation Configuration — defines the sidebar menu structure.
 *
 * Intent: Single source of truth for all navigation items.
 * Groups map to domain bounded contexts from the backend.
 *
 * Each item declares which roles can see it via `allowedRoles`.
 * An empty array means "visible to all authenticated users".
 * The `useFilteredNavigation` hook consumes this to produce a
 * role-scoped nav tree.
 */
import {
  LayoutDashboard,
  Handshake,
  Building2,
  DoorOpen,
  Truck,
  ShoppingBag,
  Layers,
  QrCode,
  ConciergeBell,
  Users,
  UserCog,
  Settings,
  TrendingUp,
  ScrollText,
  KeyRound,
  Star,
  Shield,
  BarChart2,
  Clock,
  Mail,
  Key,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type RoleId =
  | "SUPER_ADMIN"
  | "SYSTEM_ADMIN"
  | "PARTNER_ADMIN"
  | "PROPERTY_ADMIN"
  | "FRONT_DESK"
  | "HOUSEKEEPING";

export interface NavItem {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  /** Roles that can see this item. Empty = visible to all authenticated users. */
  allowedRoles?: RoleId[];
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
  /** Roles that can see this group. Empty = visible to all authenticated users. */
  allowedRoles?: RoleId[];
}

export const navigation: NavGroup[] = [
  {
    id: "overview",
    title: "Overview",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        path: "/admin",
        icon: LayoutDashboard,
        // All roles see the dashboard (content adapts per role)
      },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
    items: [
      {
        id: "onboarding-setup",
        title: "Setup Hierarchy",
        path: "/admin/onboarding",
        icon: Layers,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
    ],
  },
  {
    id: "services",
    title: "Service Management",
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
    items: [
      {
        id: "providers",
        title: "Service Providers",
        path: "/admin/providers",
        icon: Truck,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "catalog",
        title: "Service Catalog",
        path: "/admin/catalog",
        icon: ShoppingBag,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "templates",
        title: "Service Templates",
        path: "/admin/templates",
        icon: Layers,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "FRONT_DESK"],
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      {
        id: "qr",
        title: "QR Management",
        path: "/admin/qr",
        icon: QrCode,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "FRONT_DESK"],
      },
      {
        id: "qr-analytics",
        title: "QR Analytics",
        path: "/admin/qr/analytics",
        icon: BarChart2,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "qr-access-log",
        title: "Access Log",
        path: "/admin/qr/access-log",
        icon: ScrollText,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "qr-tokens",
        title: "Stay Tokens",
        path: "/admin/qr/tokens",
        icon: KeyRound,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "FRONT_DESK"],
      },
      {
        id: "front-office",
        title: "Front Office Monitor",
        path: "/admin/front-office",
        icon: ConciergeBell,
        // All roles can see the Front Office Monitor (housekeeping sees a filtered view)
      },
      {
        id: "shift-handoff",
        title: "Shift Handoff",
        path: "/admin/front-office/shift-handoff",
        icon: Clock,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "FRONT_DESK"],
      },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
    items: [
      {
        id: "revenue-report",
        title: "Revenue Report",
        path: "/admin/reports/revenue",
        icon: TrendingUp,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "satisfaction-report",
        title: "Satisfaction Report",
        path: "/admin/reports/satisfaction",
        icon: Star,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "audit-log",
        title: "Audit Log",
        path: "/admin/reports/audit",
        icon: Shield,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN"],
      },
      {
        id: "service-popularity",
        title: "Service Popularity",
        path: "/admin/reports/service-popularity",
        icon: BarChart2,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "operational-efficiency",
        title: "Operational Efficiency",
        path: "/admin/reports/operational-efficiency",
        icon: Clock,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "request-analytics",
        title: "Request Analytics",
        path: "/admin/reports/requests",
        icon: BarChart2,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "staff-analytics",
        title: "Staff Analytics",
        path: "/admin/reports/staff",
        icon: Users,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "scheduled-reports",
        title: "Scheduled Reports",
        path: "/admin/reports/scheduled",
        icon: Mail,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN"],
      },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
    items: [
      {
        id: "users",
        title: "Users",
        path: "/admin/users",
        icon: UserCog,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN"],
      },
      {
        id: "user-management",
        title: "Role Management",
        path: "/admin/users/manage",
        icon: Shield,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN"],
      },
      {
        id: "staff",
        title: "Staff",
        path: "/admin/staff",
        icon: Users,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "api-keys",
        title: "API Keys",
        path: "/admin/api-keys",
        icon: Key,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN"],
      },
      {
        id: "sso-allowlist",
        title: "SSO Allowlist",
        path: "/admin/sso-allowlist",
        icon: ShieldCheck,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN"],
      },
      {
        id: "settings",
        title: "Settings",
        path: "/admin/settings",
        icon: Settings,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
    ],
  },
  {
    id: "system",
    title: "System",
    allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN"],
    items: [
      {
        id: "overseer",
        title: "Port Overseer",
        path: "/admin/system/overseer",
        icon: ShieldCheck,
        allowedRoles: ["SUPER_ADMIN", "SYSTEM_ADMIN"],
      },
    ],
  },
];

/**
 * Filter the navigation tree based on the active role.
 * Returns only groups and items the current role is allowed to see.
 */
export function filterNavigation(roleId: string | undefined): NavGroup[] {
  if (!roleId) return [];

  return navigation
    .filter((group) => {
      if (!group.allowedRoles || group.allowedRoles.length === 0) return true;
      return group.allowedRoles.includes(roleId as RoleId);
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
        return item.allowedRoles.includes(roleId as RoleId);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

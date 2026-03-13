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
        path: "/",
        icon: LayoutDashboard,
        // All roles see the dashboard (content adapts per role)
      },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN"],
    items: [
      {
        id: "partners",
        title: "Partners",
        path: "/partners",
        icon: Handshake,
        allowedRoles: ["SUPER_ADMIN"],
      },
      {
        id: "properties",
        title: "Properties",
        path: "/properties",
        icon: Building2,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN"],
      },
      {
        id: "rooms",
        title: "Rooms",
        path: "/rooms",
        icon: DoorOpen,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
    ],
  },
  {
    id: "services",
    title: "Service Management",
    allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
    items: [
      {
        id: "providers",
        title: "Service Providers",
        path: "/providers",
        icon: Truck,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "catalog",
        title: "Service Catalog",
        path: "/catalog",
        icon: ShoppingBag,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "templates",
        title: "Service Templates",
        path: "/templates",
        icon: Layers,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "FRONT_DESK"],
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
        path: "/qr",
        icon: QrCode,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "FRONT_DESK"],
      },
      {
        id: "qr-analytics",
        title: "QR Analytics",
        path: "/qr/analytics",
        icon: BarChart2,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "qr-access-log",
        title: "Access Log",
        path: "/qr/access-log",
        icon: ScrollText,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "qr-tokens",
        title: "Stay Tokens",
        path: "/qr/tokens",
        icon: KeyRound,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "FRONT_DESK"],
      },
      {
        id: "front-office",
        title: "Front Office",
        path: "/front-office",
        icon: ConciergeBell,
        // All roles can see the front office (housekeeping sees a filtered view)
      },
      {
        id: "shift-handoff",
        title: "Shift Handoff",
        path: "/front-office/shift-handoff",
        icon: Clock,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "FRONT_DESK"],
      },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
    items: [
      {
        id: "revenue-report",
        title: "Revenue Report",
        path: "/reports/revenue",
        icon: TrendingUp,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "satisfaction-report",
        title: "Satisfaction Report",
        path: "/reports/satisfaction",
        icon: Star,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "audit-log",
        title: "Audit Log",
        path: "/reports/audit",
        icon: Shield,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN"],
      },
      {
        id: "service-popularity",
        title: "Service Popularity",
        path: "/reports/service-popularity",
        icon: BarChart2,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "operational-efficiency",
        title: "Operational Efficiency",
        path: "/reports/operational-efficiency",
        icon: Clock,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "scheduled-reports",
        title: "Scheduled Reports",
        path: "/reports/scheduled",
        icon: Mail,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN"],
      },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
    items: [
      {
        id: "users",
        title: "Users",
        path: "/users",
        icon: UserCog,
        allowedRoles: ["SUPER_ADMIN"],
      },
      {
        id: "user-management",
        title: "Role Management",
        path: "/users/manage",
        icon: Shield,
        allowedRoles: ["SUPER_ADMIN"],
      },
      {
        id: "staff",
        title: "Staff",
        path: "/staff",
        icon: Users,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
      {
        id: "api-keys",
        title: "API Keys",
        path: "/admin/api-keys",
        icon: Key,
        allowedRoles: ["SUPER_ADMIN"],
      },
      {
        id: "settings",
        title: "Settings",
        path: "/settings",
        icon: Settings,
        allowedRoles: ["SUPER_ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN"],
      },
    ],
  },
  {
    id: "system",
    title: "System",
    allowedRoles: ["SUPER_ADMIN"],
    items: [
      {
        id: "overseer",
        title: "Port Overseer",
        path: "/system/overseer",
        icon: ShieldCheck,
        allowedRoles: ["SUPER_ADMIN"],
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

/**
 * Navigation Configuration — defines the sidebar menu structure.
 *
 * Intent: Single source of truth for all navigation items.
 * Groups map to domain bounded contexts from the backend.
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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    id: "overview",
    title: "Overview",
    items: [
      { id: "dashboard", title: "Dashboard", path: "/", icon: LayoutDashboard },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    items: [
      { id: "partners", title: "Partners", path: "/partners", icon: Handshake },
      { id: "properties", title: "Properties", path: "/properties", icon: Building2 },
      { id: "rooms", title: "Rooms", path: "/rooms", icon: DoorOpen },
    ],
  },
  {
    id: "services",
    title: "Service Management",
    items: [
      { id: "providers", title: "Service Providers", path: "/providers", icon: Truck },
      { id: "catalog", title: "Service Catalog", path: "/catalog", icon: ShoppingBag },
      { id: "templates", title: "Service Templates", path: "/templates", icon: Layers },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      { id: "qr", title: "QR Management", path: "/qr", icon: QrCode },
      { id: "qr-access-log", title: "Access Log", path: "/qr/access-log", icon: ScrollText },
      { id: "qr-tokens", title: "Stay Tokens", path: "/qr/tokens", icon: KeyRound },
      { id: "front-office", title: "Front Office", path: "/front-office", icon: ConciergeBell },
      { id: "shift-handoff", title: "Shift Handoff", path: "/front-office/shift-handoff", icon: Clock },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    items: [
      { id: "revenue-report", title: "Revenue Report", path: "/reports/revenue", icon: TrendingUp },
      { id: "satisfaction-report", title: "Satisfaction Report", path: "/reports/satisfaction", icon: Star },
      { id: "audit-log", title: "Audit Log", path: "/reports/audit", icon: Shield },
      { id: "service-popularity", title: "Service Popularity", path: "/reports/service-popularity", icon: BarChart2 },
      { id: "operational-efficiency", title: "Operational Efficiency", path: "/reports/operational-efficiency", icon: Clock },
      { id: "scheduled-reports", title: "Scheduled Reports", path: "/reports/scheduled", icon: Mail },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    items: [
      { id: "users", title: "Users", path: "/users", icon: UserCog },
      { id: "staff", title: "Staff", path: "/staff", icon: Users },
      { id: "api-keys", title: "API Keys", path: "/admin/api-keys", icon: Key },
      { id: "settings", title: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

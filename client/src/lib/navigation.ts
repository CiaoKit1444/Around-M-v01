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
  Users,
  Truck,
  Package,
  Layers,
  QrCode,
  ConciergeBell,
  UserCog,
  Settings,
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
      { id: "catalog", title: "Service Catalog", path: "/catalog", icon: Package },
      { id: "templates", title: "Service Templates", path: "/templates", icon: Layers },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      { id: "qr", title: "QR Management", path: "/qr", icon: QrCode },
      { id: "front-office", title: "Front Office", path: "/front-office", icon: ConciergeBell },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    items: [
      { id: "users", title: "Users", path: "/users", icon: UserCog },
      { id: "staff", title: "Staff", path: "/staff", icon: Users },
      { id: "settings", title: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

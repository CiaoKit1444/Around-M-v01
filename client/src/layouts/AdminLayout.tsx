/**
 * AdminLayout — Main layout wrapper for all admin pages.
 *
 * Structure: [Sidebar] [TopBar + Content]
 * Sidebar is dark, content area is light neutral.
 * Responsive: sidebar becomes a drawer on mobile.
 */
import { useState, useEffect, type ReactNode } from "react";
import { Box } from "@mui/material";
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from "./Sidebar";
import TopBar from "./TopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SessionTimeoutBanner } from "@/components/SessionTimeoutBanner";
import { PendingRequestsBanner } from "@/components/PendingRequestsBanner";

interface AdminLayoutProps {
  children: ReactNode;
}

const COLLAPSE_KEY = "peppr_sidebar_collapsed";

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "true"; } catch { return false; }
  });

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onToggleCollapse={() => {
          const next = !collapsed;
          setCollapsed(next);
          try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* ignore */ }
        }}
        onClose={() => setSidebarOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          transition: "margin-left 200ms ease-out",
        }}
      >
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <SessionTimeoutBanner />
        <PendingRequestsBanner />
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, md: 3 },
            maxWidth: 1440,
            width: "100%",
            mx: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
      <MobileBottomNav />
    </Box>
  );
}

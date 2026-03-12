/**
 * AdminLayout — Main layout wrapper for all admin pages.
 *
 * Structure: [Sidebar] [TopBar + Content]
 * Sidebar is dark, content area is light neutral.
 * Responsive: sidebar becomes a drawer on mobile.
 */
import { useState, type ReactNode } from "react";
import { Box } from "@mui/material";
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from "./Sidebar";
import TopBar from "./TopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
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

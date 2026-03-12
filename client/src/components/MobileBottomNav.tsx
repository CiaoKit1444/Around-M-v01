/**
 * MobileBottomNav — Bottom navigation bar for mobile screens.
 *
 * Shows the 5 most important navigation items as a fixed bottom bar.
 * Only visible on xs/sm breakpoints.
 */
import { BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme } from "@mui/material";
import { LayoutDashboard, Building2, QrCode, ConciergeBell, Settings } from "lucide-react";
import { useLocation } from "wouter";

const MOBILE_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Properties", icon: Building2, path: "/properties" },
  { label: "QR Codes", icon: QrCode, path: "/qr" },
  { label: "Front Office", icon: ConciergeBell, path: "/front-office" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  if (!isMobile) return null;

  // Find the active tab index
  const activeIndex = MOBILE_NAV_ITEMS.findIndex(item =>
    item.path === "/" ? location === "/" : location.startsWith(item.path)
  );

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        borderTop: "1px solid",
        borderColor: "divider",
        pb: "env(safe-area-inset-bottom)",
      }}
      elevation={8}
    >
      <BottomNavigation
        value={activeIndex === -1 ? false : activeIndex}
        onChange={(_, newValue) => {
          navigate(MOBILE_NAV_ITEMS[newValue].path);
        }}
        showLabels
        sx={{
          height: 60,
          bgcolor: "background.paper",
          "& .MuiBottomNavigationAction-root": {
            minWidth: 0,
            padding: "6px 4px",
            color: "text.secondary",
            "&.Mui-selected": {
              color: "primary.main",
            },
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "0.65rem",
            "&.Mui-selected": {
              fontSize: "0.65rem",
            },
          },
        }}
      >
        {MOBILE_NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={<item.icon size={20} />}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

/**
 * GuestLayout — Mobile-first layout for the guest-facing microsite.
 *
 * Feature #46: Supports property branding config (logo, colors, welcome message).
 *
 * Design: Clean, minimal, no admin chrome. Optimized for mobile scanning.
 * The guest lands here after scanning a QR code in their room.
 */
import { Box, Typography, Container } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QrCode } from "lucide-react";
import { lightTheme } from "@/lib/theme";
import LocaleSwitcher from "@/components/guest/LocaleSwitcher";
import GuestFontSizeSwitcher from "@/components/guest/GuestFontSizeSwitcher";

export interface GuestBranding {
  /** Hex color for the header/accent, e.g. "#1A1A1A" */
  primaryColor?: string;
  /** URL to property logo image */
  logoUrl?: string;
  /** Welcome message shown below property name */
  welcomeMessage?: string;
  /** Background color for the page, e.g. "#FAFAFA" */
  bgColor?: string;
}

interface GuestLayoutProps {
  children: React.ReactNode;
  propertyName?: string;
  branding?: GuestBranding;
}

export default function GuestLayout({ children, propertyName = "Peppr Around", branding }: GuestLayoutProps) {
  const primary = branding?.primaryColor ?? "#1A1A1A";
  const bgColor = branding?.bgColor ?? "#FAFAFA";

  // Build a dynamic MUI theme based on branding
  const guestTheme = createTheme({
    ...lightTheme,
    palette: {
      ...lightTheme.palette,
      primary: { main: primary, contrastText: "#FFFFFF" },
    },
  });

  return (
    <ThemeProvider theme={guestTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: bgColor, display: "flex", flexDirection: "column" }}>
        {/* Slim Branded Header */}
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            borderBottom: "1px solid",
            borderColor: "#E5E5E5",
            py: 1.5,
            px: 2,
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(255,255,255,0.92)",
          }}
        >
          <Container maxWidth="sm" sx={{ display: "flex", alignItems: "center", gap: 1.5, px: "0 !important" }}>
            {/* Logo or default icon */}
            {branding?.logoUrl ? (
              <Box
                component="img"
                src={branding.logoUrl}
                alt={propertyName}
                sx={{ width: 32, height: 32, borderRadius: 1, objectFit: "cover", flexShrink: 0 }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 32, height: 32, borderRadius: 1,
                  background: `linear-gradient(135deg, ${primary} 0%, ${primary}99 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <QrCode size={18} color="#FFFFFF" />
              </Box>
            )}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem", color: "#171717", lineHeight: 1.2 }}>
                {propertyName}
              </Typography>
              <Typography variant="caption" sx={{ color: "#A3A3A3", fontSize: "0.6875rem", letterSpacing: 0.3 }}>
                {branding?.welcomeMessage ?? "Powered by Peppr Around"}
              </Typography>
            </Box>
            <GuestFontSizeSwitcher />
            <LocaleSwitcher />
          </Container>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1 }}>
          <Container maxWidth="sm" sx={{ py: 2, px: "16px !important" }}>
            {children}
          </Container>
        </Box>

        {/* Footer */}
        <Box sx={{ py: 2, textAlign: "center", borderTop: "1px solid", borderColor: "#E5E5E5" }}>
          <Typography variant="caption" sx={{ color: "#A3A3A3", fontSize: "0.6875rem" }}>
            {propertyName} &copy; 2026 &middot; Need help? Ask front desk
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

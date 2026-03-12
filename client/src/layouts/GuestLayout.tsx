/**
 * GuestLayout — Mobile-first layout for the guest-facing microsite.
 *
 * Design: Clean, minimal, no admin chrome. Optimized for mobile scanning.
 * The guest lands here after scanning a QR code in their room.
 *
 * Structure:
 * - Slim branded header with property name
 * - Full-width content area
 * - No sidebar, no navigation — single-flow experience
 */
import { Box, Typography, Container } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QrCode } from "lucide-react";
import { lightTheme } from "@/lib/theme";
import LocaleSwitcher from "@/components/guest/LocaleSwitcher";

interface GuestLayoutProps {
  children: React.ReactNode;
  propertyName?: string;
}

export default function GuestLayout({ children, propertyName = "Peppr Around" }: GuestLayoutProps) {
  return (
    <ThemeProvider theme={lightTheme}>
    <CssBaseline />
    <Box sx={{ minHeight: "100vh", bgcolor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      {/* Slim Header */}
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
          <Box
            sx={{
              width: 32, height: 32, borderRadius: 1,
              background: "linear-gradient(135deg, #1A1A1A 0%, #404040 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <QrCode size={18} color="#FFFFFF" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem", color: "#171717", lineHeight: 1.2 }}>
              {propertyName}
            </Typography>
            <Typography variant="caption" sx={{ color: "#A3A3A3", fontSize: "0.6875rem", letterSpacing: 0.3 }}>
              Powered by Peppr Around
            </Typography>
          </Box>
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
          Peppr Around &copy; 2026 &middot; Need help? Ask front desk
        </Typography>
      </Box>
    </Box>
    </ThemeProvider>
  );
}

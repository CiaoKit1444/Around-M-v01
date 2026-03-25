/**
 * SsoNoAccountPage — shown when a Google-authenticated user has no Peppr Around account.
 * Instructs them to contact their administrator for provisioning.
 */
import { useLocation } from "wouter";
import { Box, Typography, Button, Alert } from "@mui/material";
import { ShieldOff, ArrowLeft } from "lucide-react";

export default function SsoNoAccountPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") ?? "";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 3,
      }}
    >
      <Box sx={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <ShieldOff size={48} color="#f59e0b" style={{ marginBottom: 16 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          No account found
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
          {email
            ? `The Google account (${email}) is not linked to any Peppr Around user.`
            : "Your Google account is not linked to any Peppr Around user."}
        </Typography>
        <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
          Access to Peppr Around is by invitation only. Please contact your system administrator
          to have your account provisioned before signing in with Google.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate("/admin/login")}
          fullWidth
        >
          Back to login
        </Button>
      </Box>
    </Box>
  );
}

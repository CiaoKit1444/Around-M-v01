/**
 * PlaceholderPage — Reusable placeholder for pages under construction.
 *
 * Shows the page title, a brief description, and a "coming soon" indicator.
 * Each domain page will be replaced with full implementations incrementally.
 */
import { Box, Card, CardContent, Typography, Chip } from "@mui/material";
import { Construction } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  features?: string[];
}

export default function PlaceholderPage({ title, subtitle, features = [] }: PlaceholderPageProps) {
  return (
    <Box>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardContent sx={{ p: 4, textAlign: "center" }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <Construction size={24} strokeWidth={1.5} />
          </Box>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Under Construction
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mb: 3, maxWidth: 400, mx: "auto" }}>
            This page is being built as part of the Phase 6 frontend development.
            The backend API is fully operational.
          </Typography>
          {features.length > 0 && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
              {features.map((f) => (
                <Chip key={f} label={f} size="small" variant="outlined" />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

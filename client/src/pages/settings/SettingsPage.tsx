/**
 * SettingsPage — Platform settings and role management.
 *
 * Placeholder for system configuration, role definitions, and audit logs.
 */
import { Box, Card, CardContent, Typography, Grid, Switch, Divider, List, ListItem, ListItemText } from "@mui/material";
import PageHeader from "@/components/shared/PageHeader";
import { Settings, Shield, Bell, Globe, Database } from "lucide-react";

const SETTINGS_SECTIONS = [
  {
    title: "General",
    icon: Settings,
    items: [
      { label: "Platform Name", value: "Peppr Around", type: "text" },
      { label: "Default Timezone", value: "Asia/Bangkok", type: "text" },
      { label: "Default Currency", value: "THB", type: "text" },
    ],
  },
  {
    title: "Security",
    icon: Shield,
    items: [
      { label: "Two-Factor Authentication", value: true, type: "toggle" },
      { label: "Session Timeout (minutes)", value: "30", type: "text" },
      { label: "Max Login Attempts", value: "5", type: "text" },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    items: [
      { label: "Email Notifications", value: true, type: "toggle" },
      { label: "New Service Request Alerts", value: true, type: "toggle" },
      { label: "Partner Onboarding Alerts", value: false, type: "toggle" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <Box>
      <PageHeader title="Settings" subtitle="Platform configuration and system preferences" />

      <Grid container spacing={2}>
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Grid key={section.title} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <Icon size={16} />
                    <Typography variant="h5">{section.title}</Typography>
                  </Box>
                  <List disablePadding>
                    {section.items.map((item, i) => (
                      <Box key={item.label}>
                        <ListItem disablePadding sx={{ py: 1 }}>
                          <ListItemText
                            primary={item.label}
                            slotProps={{ primary: { sx: { fontSize: "0.8125rem" } } }}
                          />
                          {item.type === "toggle" ? (
                            <Switch size="small" defaultChecked={item.value as boolean} />
                          ) : (
                            <Typography variant="body1" sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem", color: "text.secondary" }}>
                              {item.value as string}
                            </Typography>
                          )}
                        </ListItem>
                        {i < section.items.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

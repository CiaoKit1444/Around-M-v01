/**
 * StaffPage — Staff positions and member management.
 *
 * Two-panel layout: Left shows positions, Right shows members of selected position.
 */
import { useState } from "react";
import { Box, Card, CardContent, Typography, Grid, Chip, Avatar, Divider, Button, List, ListItemButton, ListItemAvatar, ListItemText, IconButton, Tooltip } from "@mui/material";
import { Plus, Edit, Users, Briefcase, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface Position {
  id: string;
  title: string;
  department: string;
  members_count: number;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  position: string;
  property: string;
  status: string;
}

const POSITIONS: Position[] = [
  { id: "pos-1", title: "Front Desk Agent", department: "Front Office", members_count: 8 },
  { id: "pos-2", title: "Concierge", department: "Front Office", members_count: 4 },
  { id: "pos-3", title: "Housekeeping Supervisor", department: "Housekeeping", members_count: 3 },
  { id: "pos-4", title: "F&B Manager", department: "Food & Beverage", members_count: 2 },
  { id: "pos-5", title: "Spa Coordinator", department: "Spa & Wellness", members_count: 2 },
];

const MEMBERS: StaffMember[] = [
  { id: "m-1", name: "Siriwan T.", email: "siriwan@grandhyatt.com", position: "Front Desk Agent", property: "Grand Hyatt Bangkok", status: "active" },
  { id: "m-2", name: "Kittisak P.", email: "kittisak@grandhyatt.com", position: "Front Desk Agent", property: "Grand Hyatt Bangkok", status: "active" },
  { id: "m-3", name: "Naphat W.", email: "naphat@siamkempinski.com", position: "Front Desk Agent", property: "Siam Kempinski", status: "active" },
  { id: "m-4", name: "Arisa M.", email: "arisa@grandhyatt.com", position: "Concierge", property: "Grand Hyatt Bangkok", status: "active" },
  { id: "m-5", name: "Tanawat K.", email: "tanawat@centara.com", position: "Concierge", property: "Centara Grand", status: "on_leave" },
];

export default function StaffPage() {
  const [selectedPos, setSelectedPos] = useState<string>("pos-1");
  const selectedPosition = POSITIONS.find(p => p.id === selectedPos);

  return (
    <Box>
      <PageHeader
        title="Staff"
        subtitle="Manage staff positions and team members"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Briefcase size={14} />} onClick={() => toast.info("Feature coming soon")}>Add Position</Button>
            <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => toast.info("Feature coming soon")}>Add Member</Button>
          </Box>
        }
      />

      <Grid container spacing={2}>
        {/* Left: Positions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="h6" sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Positions
                </Typography>
              </Box>
              <List disablePadding>
                {POSITIONS.map((pos, i) => (
                  <Box key={pos.id}>
                    <ListItemButton
                      selected={selectedPos === pos.id}
                      onClick={() => setSelectedPos(pos.id)}
                      sx={{ py: 1.5, px: 2, "&.Mui-selected": { bgcolor: "action.selected", borderRight: "2px solid", borderColor: "primary.main" } }}
                    >
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: selectedPos === pos.id ? "primary.main" : "action.hover", color: selectedPos === pos.id ? "primary.contrastText" : "text.secondary" }}>
                          <Briefcase size={14} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={pos.title}
                        secondary={pos.department}
                        slotProps={{
                          primary: { sx: { fontWeight: 500, fontSize: "0.8125rem" } },
                          secondary: { sx: { fontSize: "0.6875rem" } },
                        }}
                      />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Chip label={pos.members_count} size="small" sx={{ height: 20, fontSize: "0.625rem" }} />
                        <ChevronRight size={14} color="#A3A3A3" />
                      </Box>
                    </ListItemButton>
                    {i < POSITIONS.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Members */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="h5">{selectedPosition?.title || "Select a Position"}</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>{selectedPosition?.department}</Typography>
                </Box>
                <Chip icon={<Users size={12} />} label={`${selectedPosition?.members_count || 0} members`} size="small" variant="outlined" />
              </Box>

              <Box>
                {MEMBERS.filter(m => m.position === selectedPosition?.title).map((member, i, arr) => (
                  <Box key={member.id}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, fontSize: "0.75rem", fontWeight: 600, bgcolor: "primary.light", color: "primary.contrastText" }}>
                          {member.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>{member.name}</Typography>
                          <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem", color: "text.secondary" }}>{member.email}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>{member.property}</Typography>
                        <StatusChip status={member.status} />
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => toast.info(`Edit ${member.name}`)}><Edit size={14} /></IconButton></Tooltip>
                      </Box>
                    </Box>
                    {i < arr.length - 1 && <Divider />}
                  </Box>
                ))}
                {MEMBERS.filter(m => m.position === selectedPosition?.title).length === 0 && (
                  <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                    <Users size={32} strokeWidth={1} />
                    <Typography variant="body1" sx={{ mt: 1 }}>No members in this position</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

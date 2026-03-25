/**
 * StaffPage — Staff positions and member management.
 *
 * Design: Precision Studio — two-panel layout: positions (left) + members (right).
 * Data: TanStack Query → FastAPI backend, with demo data fallback.
 */
import { useState } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Avatar, Divider, Button, List,
  ListItemButton, ListItemAvatar, ListItemText, IconButton, Tooltip, Alert,
} from "@mui/material";
import { Plus, Edit, Users, Briefcase, ChevronRight, Download } from "lucide-react";
import { useMemo } from "react";
import { useExportCSV } from "@/hooks/useExportCSV";
import type { CSVColumn } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoPositions, getDemoMembers } from "@/lib/api/demo-data";
import type { StaffPosition, StaffMember } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";
import { staffApi } from "@/lib/api/endpoints";

export default function StaffPage() {
  const [, navigate] = useLocation();
  const [selectedPosId, setSelectedPosId] = useState<string>("");

  const positionsQuery = useQuery({
    queryKey: ["staff", "positions"],
    queryFn: () => staffApi.listPositions(),
    staleTime: 30_000,
  });
  const membersQuery = useQuery({
    queryKey: ["staff", "members"],
    queryFn: () => staffApi.listMembers(),
    staleTime: 30_000,
  });

  const membersCsvColumns = useMemo<CSVColumn<StaffMember>[]>(() => [
    { header: "ID", accessor: "id" },
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    { header: "Position", accessor: "position_title" },
    { header: "Property", accessor: "property_name" },
    { header: "Status", accessor: "status" },
    { header: "Created", accessor: (r) => new Date(r.created_at).toLocaleDateString() },
  ], []);
  const { exportCSV: exportMembersCSV, exporting: exportingMembers } = useExportCSV<StaffMember>("staff-members", membersCsvColumns);

  // Stabilize demo data with useState — inline getDemoX() creates new ref each render
  const [demoPositions] = useState(() => getDemoPositions());
  const [demoMembers] = useState(() => getDemoMembers());
  const { data: positionsData, isDemo: posDemo } = useDemoFallback(positionsQuery, demoPositions);
  const { data: membersData, isDemo: memDemo } = useDemoFallback(membersQuery, demoMembers);
  const isDemo = posDemo || memDemo;

  const positions = positionsData?.items ?? [];
  const members = membersData?.items ?? [];

  // Auto-select first position if none selected
  const activePos = selectedPosId || (positions.length > 0 ? positions[0].id : "");
  const selectedPosition = positions.find((p: StaffPosition) => p.id === activePos);
  const filteredMembers = members.filter((m: StaffMember) => m.position_id === activePos);

  return (
    <Box>
      <PageHeader
        title="Staff"
        subtitle="Manage staff positions and team members"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Download size={14} />} onClick={() => exportMembersCSV(members)} disabled={exportingMembers}>Export CSV</Button>
            <Button variant="outlined" size="small" startIcon={<Briefcase size={14} />} onClick={() => navigate("/staff/positions/new")}>Add Position</Button>
            <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => navigate("/staff/members/new")}>Add Member</Button>
          </Box>
        }
      />

      {isDemo && <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Showing demo data — connect the FastAPI backend to see live data.</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "320px 1fr" }, gap: 2 }}>
        {/* Left: Positions */}
        <Card sx={{ height: "fit-content" }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="h6" sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Positions ({positions.length})
              </Typography>
            </Box>
            <List disablePadding>
              {positions.map((pos: StaffPosition, i: number) => (
                <Box key={pos.id}>
                  <ListItemButton
                    selected={activePos === pos.id}
                    onClick={() => setSelectedPosId(pos.id)}
                    sx={{ py: 1.5, px: 2, "&.Mui-selected": { bgcolor: "action.selected", borderRight: "2px solid", borderColor: "primary.main" } }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: activePos === pos.id ? "primary.main" : "action.hover", color: activePos === pos.id ? "primary.contrastText" : "text.secondary" }}>
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
                  {i < positions.length - 1 && <Divider />}
                </Box>
              ))}
              {positions.length === 0 && (
                <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                  <Briefcase size={28} strokeWidth={1} />
                  <Typography variant="body2" sx={{ mt: 1 }}>No positions defined</Typography>
                </Box>
              )}
            </List>
          </CardContent>
        </Card>

        {/* Right: Members */}
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="h5">{selectedPosition?.title || "Select a Position"}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>{selectedPosition?.department}</Typography>
              </Box>
              <Chip icon={<Users size={12} />} label={`${filteredMembers.length} members`} size="small" variant="outlined" />
            </Box>

            <Box>
              {filteredMembers.map((member: StaffMember, i: number, arr: StaffMember[]) => (
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
                      <StatusChip status={member.status} />
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/staff/members/${member.id}/edit`)}><Edit size={14} /></IconButton></Tooltip>
                    </Box>
                  </Box>
                  {i < arr.length - 1 && <Divider />}
                </Box>
              ))}
              {filteredMembers.length === 0 && (
                <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                  <Users size={32} strokeWidth={1} />
                  <Typography variant="body1" sx={{ mt: 1 }}>No members in this position</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

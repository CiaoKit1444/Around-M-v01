/**
 * OnboardingWizard — Step-by-step setup guide for new properties.
 *
 * Feature #48: Guides new admins through the 5 key setup steps:
 *   1. Create Partner
 *   2. Create Property
 *   3. Add Rooms
 *   4. Set up Service Catalog & Templates
 *   5. Generate QR Codes
 *
 * Shown as a dismissible banner on the Dashboard when setup is incomplete.
 */
import { useState } from "react";
import {
  Box, Card, CardContent, Typography, Button, Stepper, Step, StepLabel,
  StepContent, LinearProgress, Chip, Collapse, IconButton, Tooltip,
} from "@mui/material";
import {
  Handshake, Building2, DoorOpen, Layers, QrCode,
  CheckCircle2, ChevronDown, ChevronUp, X, Rocket,
} from "lucide-react";
import { useLocation } from "wouter";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action: string;
  path: string;
  completed: boolean;
}

interface OnboardingWizardProps {
  /** Pass completion status from actual data queries */
  hasPartners?: boolean;
  hasProperties?: boolean;
  hasRooms?: boolean;
  hasTemplates?: boolean;
  hasQRCodes?: boolean;
  onDismiss?: () => void;
}

export default function OnboardingWizard({
  hasPartners = false,
  hasProperties = false,
  hasRooms = false,
  hasTemplates = false,
  hasQRCodes = false,
  onDismiss,
}: OnboardingWizardProps) {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(true);

  const steps: OnboardingStep[] = [
    {
      id: "partner",
      title: "Create your first Partner",
      description: "Partners are the hotel groups or management companies that own properties. Start by registering your first partner organization.",
      icon: Handshake,
      action: "Add Partner",
      path: "/admin/partners/new",
      completed: hasPartners,
    },
    {
      id: "property",
      title: "Add a Property",
      description: "Properties are the individual hotels or venues. Link them to a partner and configure their branding and settings.",
      icon: Building2,
      action: "Add Property",
      path: "/admin/properties/new",
      completed: hasProperties,
    },
    {
      id: "rooms",
      title: "Register Rooms",
      description: "Add the rooms or units within your property. Each room will get its own QR code for guest access.",
      icon: DoorOpen,
      action: "Add Rooms",
      path: "/admin/rooms/new",
      completed: hasRooms,
    },
    {
      id: "templates",
      title: "Set up Service Templates",
      description: "Create service templates to bundle amenities and services. Assign templates to rooms to define what guests can request.",
      icon: Layers,
      action: "Create Template",
      path: "/admin/templates/new",
      completed: hasTemplates,
    },
    {
      id: "qr",
      title: "Generate QR Codes",
      description: "Generate and print QR codes for each room. Guests scan these to access the service menu and make requests.",
      icon: QrCode,
      action: "Go to QR Management",
      path: "/admin/qr",
      completed: hasQRCodes,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progress = (completedCount / totalCount) * 100;
  const isComplete = completedCount === totalCount;
  const activeStep = steps.findIndex((s) => !s.completed);

  if (isComplete) return null;

  return (
    <Card
      sx={{
        mb: 3,
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: 2,
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)"
            : "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)",
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: expanded ? 2 : 0 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 1.5,
              bgcolor: "primary.main", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Rocket size={18} color="white" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                Get Started with PEPPR Around
              </Typography>
              <Chip
                label={`${completedCount}/${totalCount} complete`}
                size="small"
                color={completedCount > 0 ? "primary" : "default"}
                sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 600 }}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 4, borderRadius: 2, bgcolor: "action.hover" }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
            <Tooltip title={expanded ? "Collapse" : "Expand"}>
              <IconButton size="small" onClick={() => setExpanded((v) => !v)}>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </IconButton>
            </Tooltip>
            {onDismiss && (
              <Tooltip title="Dismiss (you can find this in Settings)">
                <IconButton size="small" onClick={onDismiss}>
                  <X size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Steps */}
        <Collapse in={expanded}>
          <Stepper activeStep={activeStep} orientation="vertical" sx={{ "& .MuiStepConnector-line": { minHeight: 16 } }}>
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Step key={step.id} completed={step.completed} expanded={!step.completed && steps.findIndex((s) => !s.completed) === steps.indexOf(step)}>
                  <StepLabel
                    StepIconComponent={() =>
                      step.completed ? (
                        <CheckCircle2 size={20} color="#22c55e" />
                      ) : (
                        <Box
                          sx={{
                            width: 20, height: 20, borderRadius: "50%",
                            bgcolor: steps.indexOf(step) === activeStep ? "primary.main" : "action.disabled",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Icon size={11} color="white" />
                        </Box>
                      )
                    }
                    sx={{
                      "& .MuiStepLabel-label": {
                        fontWeight: step.completed ? 400 : 600,
                        color: step.completed ? "text.secondary" : "text.primary",
                        fontSize: "0.8125rem",
                        textDecoration: step.completed ? "line-through" : "none",
                      },
                    }}
                  >
                    {step.title}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5, fontSize: "0.8125rem", lineHeight: 1.5 }}>
                      {step.description}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Icon size={14} />}
                      onClick={() => navigate(step.path)}
                      sx={{ fontSize: "0.75rem" }}
                    >
                      {step.action}
                    </Button>
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
        </Collapse>
      </CardContent>
    </Card>
  );
}

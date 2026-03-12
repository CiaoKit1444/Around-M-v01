/**
 * Precision Studio — MUI Theme Configuration
 *
 * Design: Swiss International Style meets Modern SaaS
 * Font: Geist (display + body) / Geist Mono (technical data)
 * Palette: Near-monochrome with Blue-600 primary
 */
import { createTheme, type ThemeOptions } from "@mui/material/styles";

const FONT_SANS = '"Geist", ui-sans-serif, system-ui, sans-serif';
const FONT_MONO = '"Geist Mono", ui-monospace, monospace';

const baseOptions: ThemeOptions = {
  typography: {
    fontFamily: FONT_SANS,
    h1: { fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 },
    h2: { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3 },
    h3: { fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.4 },
    h4: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.5 },
    subtitle1: { fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.5, letterSpacing: "0.02em" },
    body1: { fontSize: "0.8125rem", fontWeight: 400, lineHeight: 1.6 },
    body2: { fontSize: "0.75rem", fontWeight: 400, lineHeight: 1.6 },
    caption: { fontSize: "0.6875rem", fontWeight: 500, lineHeight: 1.5, letterSpacing: "0.04em", textTransform: "uppercase" as const },
    overline: { fontSize: "0.6875rem", fontWeight: 500, lineHeight: 1.5, letterSpacing: "0.06em", textTransform: "uppercase" as const },
    button: { fontSize: "0.8125rem", fontWeight: 500, letterSpacing: "0.01em", textTransform: "none" as const },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 6, padding: "6px 16px", minHeight: 36 },
        sizeSmall: { padding: "4px 12px", minHeight: 32, fontSize: "0.75rem" },
        sizeLarge: { padding: "8px 24px", minHeight: 44 },
        containedPrimary: { "&:hover": { boxShadow: "0 1px 3px 0 rgba(37,99,235,0.3)" } },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: 8, border: "1px solid", borderColor: "var(--border)" },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: "0.8125rem", padding: "10px 16px", borderColor: "var(--border)" },
        head: { fontWeight: 600, fontSize: "0.6875rem", letterSpacing: "0.04em", textTransform: "uppercase" as const },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 4, height: 24, fontSize: "0.6875rem", fontWeight: 500 },
        sizeSmall: { height: 20, fontSize: "0.625rem" },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
      styleOverrides: {
        root: { "& .MuiInputBase-root": { fontSize: "0.8125rem" } },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: "0.8125rem" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: "0.75rem", borderRadius: 4 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12 },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: { fontSize: "0.8125rem" },
        separator: { marginLeft: 4, marginRight: 4 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 500, fontSize: "0.8125rem", minHeight: 40 },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: "light",
    primary: { main: "#2563EB", light: "#60A5FA", dark: "#1D4ED8", contrastText: "#FFFFFF" },
    secondary: { main: "#8B5CF6", light: "#A78BFA", dark: "#7C3AED" },
    error: { main: "#EF4444", light: "#FCA5A5", dark: "#DC2626" },
    warning: { main: "#F59E0B", light: "#FCD34D", dark: "#D97706" },
    success: { main: "#10B981", light: "#6EE7B7", dark: "#059669" },
    info: { main: "#0EA5E9", light: "#7DD3FC", dark: "#0284C7" },
    background: { default: "#FAFAFA", paper: "#FFFFFF" },
    text: { primary: "#171717", secondary: "#737373", disabled: "#A3A3A3" },
    divider: "#E5E5E5",
    action: { hover: "rgba(0,0,0,0.04)", selected: "rgba(37,99,235,0.08)" },
  },
});

export const darkTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: "dark",
    primary: { main: "#3B82F6", light: "#60A5FA", dark: "#2563EB", contrastText: "#FFFFFF" },
    secondary: { main: "#A78BFA", light: "#C4B5FD", dark: "#8B5CF6" },
    error: { main: "#F87171", light: "#FCA5A5", dark: "#EF4444" },
    warning: { main: "#FBBF24", light: "#FCD34D", dark: "#F59E0B" },
    success: { main: "#34D399", light: "#6EE7B7", dark: "#10B981" },
    info: { main: "#38BDF8", light: "#7DD3FC", dark: "#0EA5E9" },
    background: { default: "#0A0A0A", paper: "#171717" },
    text: { primary: "#E5E5E5", secondary: "#A3A3A3", disabled: "#525252" },
    divider: "#262626",
    action: { hover: "rgba(255,255,255,0.06)", selected: "rgba(59,130,246,0.12)" },
  },
});

export { FONT_SANS, FONT_MONO };

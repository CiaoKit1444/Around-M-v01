/**
 * App — Root component with MUI theme, auth, and routing.
 *
 * Architecture:
 * - /auth/* routes render without AdminLayout
 * - /guest/* routes render the guest-facing microsite (no admin layout)
 * - All other routes render inside AdminLayout with sidebar + topbar
 * - MUI ThemeProvider wraps everything for consistent styling
 */
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { lightTheme, darkTheme } from "./lib/theme";
import AdminLayout from "./layouts/AdminLayout";
import RouteTransitionBar from "./components/RouteTransitionBar";

// Auth
import LoginPage from "./pages/auth/LoginPage";

// List Pages
import DashboardPage from "./pages/dashboard/DashboardPage";
import PartnersPage from "./pages/partners/PartnersPage";
import PropertiesPage from "./pages/properties/PropertiesPage";
import RoomsPage from "./pages/rooms/RoomsPage";
import ProvidersPage from "./pages/providers/ProvidersPage";
import CatalogPage from "./pages/catalog/CatalogPage";
import TemplatesPage from "./pages/templates/TemplatesPage";
import QRManagementPage from "./pages/qr/QRManagementPage";
import FrontOfficePage from "./pages/frontoffice/FrontOfficePage";
import UsersPage from "./pages/users/UsersPage";
import StaffPage from "./pages/staff/StaffPage";
import SettingsPage from "./pages/settings/SettingsPage";

// Detail/Edit Pages
import PartnerDetailPage from "./pages/partners/PartnerDetailPage";
import PropertyDetailPage from "./pages/properties/PropertyDetailPage";
import RoomDetailPage from "./pages/rooms/RoomDetailPage";
import ProviderDetailPage from "./pages/providers/ProviderDetailPage";
import CatalogDetailPage from "./pages/catalog/CatalogDetailPage";
import TemplateDetailPage from "./pages/templates/TemplateDetailPage";
import QRDetailPage from "./pages/qr/QRDetailPage";
import QRPrintPage from "./pages/qr/QRPrintPage";
import QRAccessLogPage from "./pages/qr/QRAccessLogPage";
import StayTokensPage from "./pages/qr/StayTokensPage";
import UserDetailPage from "./pages/users/UserDetailPage";
import RequestDetailPage from "./pages/frontoffice/RequestDetailPage";
import ShiftHandoffPage from "./pages/frontoffice/ShiftHandoffPage";

// Guest Microsite Pages
import ScanLandingPage from "./pages/guest/ScanLandingPage";
import ServiceMenuPage from "./pages/guest/ServiceMenuPage";
import RequestPage from "./pages/guest/RequestPage";
import TrackRequestPage from "./pages/guest/TrackRequestPage";
import GuestHistoryPage from "./pages/guest/GuestHistoryPage";

import RevenueReportPage from "./pages/reports/RevenueReportPage";
import SatisfactionReportPage from "./pages/reports/SatisfactionReportPage";
import AuditLogPage from "./pages/reports/AuditLogPage";
import ServicePopularityReport from "./pages/admin/ServicePopularityReport";
import OperationalEfficiencyReport from "./pages/admin/OperationalEfficiencyReport";
import ScheduledReports from "./pages/admin/ScheduledReports";
import TwoFactorPage from "./pages/settings/TwoFactorPage";
import ApiKeyManagementPage from "./pages/admin/ApiKeyManagementPage";
import SessionManagementPage from "./pages/settings/SessionManagementPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function MuiThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <MuiThemeProvider theme={theme === "dark" ? darkTheme : lightTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

function AdminRoutes() {
  return (
    <AdminLayout>
      <Switch>
        {/* Dashboard */}
        <Route path="/" component={DashboardPage} />

        {/* Partners */}
        <Route path="/partners" component={PartnersPage} />
        <Route path="/partners/new" component={PartnerDetailPage} />
        <Route path="/partners/:id" component={PartnerDetailPage} />

        {/* Properties */}
        <Route path="/properties" component={PropertiesPage} />
        <Route path="/properties/new" component={PropertyDetailPage} />
        <Route path="/properties/:id" component={PropertyDetailPage} />

        {/* Rooms */}
        <Route path="/rooms" component={RoomsPage} />
        <Route path="/rooms/new" component={RoomDetailPage} />
        <Route path="/rooms/:id" component={RoomDetailPage} />

        {/* Service Providers */}
        <Route path="/providers" component={ProvidersPage} />
        <Route path="/providers/new" component={ProviderDetailPage} />
        <Route path="/providers/:id" component={ProviderDetailPage} />

        {/* Service Catalog */}
        <Route path="/catalog" component={CatalogPage} />
        <Route path="/catalog/new" component={CatalogDetailPage} />
        <Route path="/catalog/:id" component={CatalogDetailPage} />

        {/* Service Templates */}
        <Route path="/templates" component={TemplatesPage} />
        <Route path="/templates/new" component={TemplateDetailPage} />
        <Route path="/templates/:id" component={TemplateDetailPage} />

        {/* QR Management */}
        <Route path="/qr" component={QRManagementPage} />
        <Route path="/qr/print" component={QRPrintPage} />
        <Route path="/qr/access-log" component={QRAccessLogPage} />
        <Route path="/qr/tokens" component={StayTokensPage} />
        <Route path="/qr/:id" component={QRDetailPage} />

        {/* Front Office */}
        <Route path="/front-office" component={FrontOfficePage} />
        <Route path="/front-office/requests/:id" component={RequestDetailPage} />
        <Route path="/front-office/shift-handoff" component={ShiftHandoffPage} />
        <Route path="/admin/api-keys" component={ApiKeyManagementPage} />

        {/* Users */}
        <Route path="/users" component={UsersPage} />
        <Route path="/users/new" component={UserDetailPage} />
        <Route path="/users/:id" component={UserDetailPage} />

        {/* Staff */}
        <Route path="/staff" component={StaffPage} />

        {/* Reports */}
        <Route path="/reports/revenue" component={RevenueReportPage} />
        <Route path="/reports/satisfaction" component={SatisfactionReportPage} />
        <Route path="/reports/audit" component={AuditLogPage} />
        <Route path="/reports/service-popularity" component={ServicePopularityReport} />
        <Route path="/reports/operational-efficiency" component={OperationalEfficiencyReport} />
        <Route path="/reports/scheduled" component={ScheduledReports} />

        {/* Settings */}
        <Route path="/settings" component={SettingsPage} />
        <Route path="/settings/2fa" component={TwoFactorPage} />
        <Route path="/settings/sessions" component={SessionManagementPage} />

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/auth/login" component={LoginPage} />
      {/* Guest Microsite — mobile-first, no admin chrome */}
      <Route path="/guest/scan/:qrCodeId" component={ScanLandingPage} />
      <Route path="/guest/menu/:sessionId" component={ServiceMenuPage} />
      <Route path="/guest/request/:sessionId" component={RequestPage} />
      <Route path="/guest/track/:requestNumber" component={TrackRequestPage} />
      <Route path="/guest/history/:sessionId" component={GuestHistoryPage} />
      {/* Admin — all other routes */}
      <Route>{() => <AdminRoutes />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <MuiThemeWrapper>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TooltipProvider>
                <RouteTransitionBar />
                <Toaster />
                <Router />
              </TooltipProvider>
            </AuthProvider>
          </QueryClientProvider>
        </MuiThemeWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

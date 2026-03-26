/**
 * App — Root component with MUI theme, auth, and routing.
 *
 * Route architecture (path-based portals, all under bo.peppr.vip):
 * - /admin/*  → Admin back-office (login, dashboard, all management pages)
 * - /fo/*     → Front Office portal
 * - /sp/*     → Service Provider portal
 * - /guest/*  → Guest-facing microsite (mobile-first, no admin chrome)
 * Root / redirects to /admin for convenience. (nav-fix-v3)
 */
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { lightTheme, darkTheme } from "./lib/theme";
import AdminLayout from "./layouts/AdminLayout";
import RouteTransitionBar from "./components/RouteTransitionBar";
import AdminGuard from "./components/AdminGuard";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import RoleSwitchPage from "./pages/auth/RoleSwitchPage";
import SsoBlockedPage from "./pages/auth/SsoBlockedPage";
import SsoCompletePage from "./pages/auth/SsoCompletePage";
import SsoNoAccountPage from "./pages/auth/SsoNoAccountPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// List Pages
import DashboardPage from "./pages/dashboard/DashboardPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import PartnersPage from "./pages/partners/PartnersPage";
import PropertiesPage from "./pages/properties/PropertiesPage";
import RoomsPage from "./pages/rooms/RoomsPage";
import ProvidersPage from "./pages/providers/ProvidersPage";
import CatalogPage from "./pages/catalog/CatalogPage";
import TemplatesPage from "./pages/templates/TemplatesPage";
import QRManagementPage from "./pages/qr/QRManagementPage";
import FrontOfficePage from "./pages/frontoffice/FrontOfficePage";
import UsersPage from "./pages/users/UsersPage";
import UserManagementPage from "./pages/users/UserManagementPage";
import StaffPage from "./pages/staff/StaffPage";
import StaffMemberDetailPage from "./pages/staff/StaffMemberDetailPage";
import StaffPositionDetailPage from "./pages/staff/StaffPositionDetailPage";
import SettingsPage from "./pages/settings/SettingsPage";

// Detail/Edit Pages
import PartnerDetailPage from "./pages/partners/PartnerDetailPage";
import PropertyDetailPage from "./pages/properties/PropertyDetailPage";
import RoomDetailPage from "./pages/rooms/RoomDetailPage";
import ProviderDetailPage from "./pages/providers/ProviderDetailPage";
import CatalogDetailPage from "./pages/catalog/CatalogDetailPage";
import TemplateDetailPage from "./pages/templates/TemplateDetailPage";
import QRDetailPage from "./pages/qr/QRDetailPage";
import QRSimulatorPage from "./pages/qr/QRSimulatorPage";
import QRPrintPage from "./pages/qr/QRPrintPage";
import QRAccessLogPage from "./pages/qr/QRAccessLogPage";
import StayTokensPage from "./pages/qr/StayTokensPage";
import QRAnalyticsDashboard from "./pages/qr/QRAnalyticsDashboard";
import UserDetailPage from "./pages/users/UserDetailPage";
import RequestDetailPage from "./pages/frontoffice/RequestDetailPage";
import ShiftHandoffPage from "./pages/frontoffice/ShiftHandoffPage";

// Guest Microsite Pages
import ScanLandingPage from "./pages/guest/ScanLandingPage";
import ServiceMenuPage from "./pages/guest/ServiceMenuPage";
import RequestPage from "./pages/guest/RequestPage";
import TrackRequestPage from "./pages/guest/TrackRequestPage";
import GuestHistoryPage from "./pages/guest/GuestHistoryPage";
import PaymentPage from "./pages/guest/PaymentPage";

import RevenueReportPage from "./pages/reports/RevenueReportPage";
import SatisfactionReportPage from "./pages/reports/SatisfactionReportPage";
import AuditLogPage from "./pages/reports/AuditLogPage";
import RequestAnalyticsPage from "./pages/reports/RequestAnalyticsPage";
import StaffAnalyticsPage from "./pages/reports/StaffAnalyticsPage";
import ServicePopularityReport from "./pages/admin/ServicePopularityReport";
import OperationalEfficiencyReport from "./pages/admin/OperationalEfficiencyReport";
import ScheduledReports from "./pages/admin/ScheduledReports";
import TwoFactorPage from "./pages/settings/TwoFactorPage";
import ApiKeyManagementPage from "./pages/admin/ApiKeyManagementPage";
import SsoAllowlistPage from "./pages/admin/SsoAllowlistPage";
import SessionManagementPage from "./pages/settings/SessionManagementPage";
import NotFound from "./pages/NotFound";
import OverseerPage from "./pages/system/OverseerPage";

// Front Office Portal
import FOLayout from "./layouts/FOLayout";
import FOOverviewPage from "./pages/fo/FOOverviewPage";
import FONotificationsPage from "./pages/fo/FONotificationsPage";
import FOQueuePage from "./pages/fo/FOQueuePage";
import FORequestDetailPage from "./pages/fo/FORequestDetailPage";

// SP Portal
import SPLayout from "./layouts/SPLayout";
import SPOverviewPage from "./pages/sp/SPOverviewPage";
import SPJobQueuePage from "./pages/sp/SPJobQueuePage";
import SPJobDetailPage from "./pages/sp/SPJobDetailPage";
import SPInboundPage from "./pages/sp/SPInboundPage";
import SPOutboundPage from "./pages/sp/SPOutboundPage";
import SPOperatorsPage from "./pages/sp/SPOperatorsPage";

// SO Portal
import SOLayout from "./layouts/SOLayout";
import SOJobsPage from "./pages/so/SOJobsPage";
import SOJobDetailPage from "./pages/so/SOJobDetailPage";

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
    <AdminGuard>
    <AdminLayout>
      <Switch>
        {/* Dashboard */}
        <Route path="/admin" component={DashboardPage} />
        <Route path="/admin/" component={DashboardPage} />

        {/* Unified Onboarding Drill-Down: Partner → Service Area → Service Unit */}
        <Route path="/admin/onboarding" component={OnboardingPage} />

        {/* Detail/edit pages — MUST come before list routes (wouter prefix matching) */}
        <Route path="/admin/partners/new" component={PartnerDetailPage} />
        <Route path="/admin/partners/:id/edit" component={PartnerDetailPage} />
        <Route path="/admin/partners/:id" component={PartnerDetailPage} />
        <Route path="/admin/properties/new" component={PropertyDetailPage} />
        <Route path="/admin/properties/:id/edit" component={PropertyDetailPage} />
        <Route path="/admin/properties/:id" component={PropertyDetailPage} />
        <Route path="/admin/rooms/new" component={RoomDetailPage} />
        <Route path="/admin/rooms/:id/edit" component={RoomDetailPage} />
        <Route path="/admin/rooms/:id" component={RoomDetailPage} />

        {/* Legacy list routes → redirect to /admin/onboarding */}
        <Route path="/admin/partners">{() => { window.location.replace("/admin/onboarding"); return null; }}</Route>
        <Route path="/admin/properties">{() => { window.location.replace("/admin/onboarding"); return null; }}</Route>
        <Route path="/admin/rooms">{() => { window.location.replace("/admin/onboarding"); return null; }}</Route>

        {/* Service Providers — detail before list */}
        <Route path="/admin/providers/new" component={ProviderDetailPage} />
        <Route path="/admin/providers/:id/edit" component={ProviderDetailPage} />
        <Route path="/admin/providers/:id" component={ProviderDetailPage} />
        <Route path="/admin/providers" component={ProvidersPage} />

        {/* Service Catalog — detail before list */}
        <Route path="/admin/catalog/new" component={CatalogDetailPage} />
        <Route path="/admin/catalog/:id/edit" component={CatalogDetailPage} />
        <Route path="/admin/catalog/:id" component={CatalogDetailPage} />
        <Route path="/admin/catalog" component={CatalogPage} />

        {/* Service Templates — detail before list */}
        <Route path="/admin/templates/new" component={TemplateDetailPage} />
        <Route path="/admin/templates/:id/edit" component={TemplateDetailPage} />
        <Route path="/admin/templates/:id" component={TemplateDetailPage} />
        <Route path="/admin/templates" component={TemplatesPage} />

        {/* QR Management — static sub-routes and detail before list */}
        <Route path="/admin/qr/print" component={QRPrintPage} />
        <Route path="/admin/qr/access-log" component={QRAccessLogPage} />
        <Route path="/admin/qr/tokens" component={StayTokensPage} />
        <Route path="/admin/qr/analytics" component={QRAnalyticsDashboard} />
        <Route path="/admin/qr/:id/simulate" component={QRSimulatorPage} />
        <Route path="/admin/qr/:id" component={QRDetailPage} />
        <Route path="/admin/qr" component={QRManagementPage} />

        {/* Front Office — sub-routes before base */}
        <Route path="/admin/front-office/requests/:id" component={RequestDetailPage} />
        <Route path="/admin/front-office/shift-handoff" component={ShiftHandoffPage} />
        <Route path="/admin/front-office" component={FrontOfficePage} />

        {/* Admin-only tools */}
        <Route path="/admin/api-keys" component={ApiKeyManagementPage} />
        <Route path="/admin/sso-allowlist" component={SsoAllowlistPage} />

        {/* Users — sub-routes before list */}
        <Route path="/admin/users/manage" component={UserManagementPage} />
        <Route path="/admin/users/new" component={UserDetailPage} />
        <Route path="/admin/users/invite" component={UserDetailPage} />
        <Route path="/admin/users/:id/edit" component={UserDetailPage} />
        <Route path="/admin/users/:id" component={UserDetailPage} />
        <Route path="/admin/users" component={UsersPage} />

        {/* Staff — sub-routes before list */}
        <Route path="/admin/staff/members/new" component={StaffMemberDetailPage} />
        <Route path="/admin/staff/members/:id/edit" component={StaffMemberDetailPage} />
        <Route path="/admin/staff/positions/new" component={StaffPositionDetailPage} />
        <Route path="/admin/staff/positions/:id/edit" component={StaffPositionDetailPage} />
        <Route path="/admin/staff" component={StaffPage} />

        {/* Reports */}
        <Route path="/admin/reports/revenue" component={RevenueReportPage} />
        <Route path="/admin/reports/satisfaction" component={SatisfactionReportPage} />
        <Route path="/admin/reports/audit" component={AuditLogPage} />
        <Route path="/admin/reports/service-popularity" component={ServicePopularityReport} />
        <Route path="/admin/reports/operational-efficiency" component={OperationalEfficiencyReport} />
        <Route path="/admin/reports/scheduled" component={ScheduledReports} />
        <Route path="/admin/reports/requests" component={RequestAnalyticsPage} />
        <Route path="/admin/reports/staff" component={StaffAnalyticsPage} />

        {/* Settings */}
        <Route path="/admin/settings" component={SettingsPage} />
        <Route path="/admin/settings/2fa" component={TwoFactorPage} />
        <Route path="/admin/settings/sessions" component={SessionManagementPage} />

        {/* System */}
        <Route path="/admin/system/overseer" component={OverseerPage} />

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
    </AdminGuard>
  );
}

function FORoutes() {
  return (
    <FOLayout>
      <Switch>
        <Route path="/fo" component={FOOverviewPage} />
        <Route path="/fo/notifications" component={FONotificationsPage} />
        <Route path="/fo/queue" component={FOQueuePage} />
        <Route path="/fo/queue/:id" component={FORequestDetailPage} />
        <Route component={NotFound} />
      </Switch>
    </FOLayout>
  );
}

function SPRoutes() {
  return (
    <SPLayout>
      <Switch>
        <Route path="/sp" component={SPOverviewPage} />
        <Route path="/sp/jobs" component={SPJobQueuePage} />
        <Route path="/sp/jobs/:id" component={SPJobDetailPage} />
        <Route path="/sp/inbound" component={SPInboundPage} />
        <Route path="/sp/outbound" component={SPOutboundPage} />
        <Route path="/sp/operators" component={SPOperatorsPage} />
        <Route path="/sp/history" component={SPJobQueuePage} />
        <Route component={NotFound} />
      </Switch>
    </SPLayout>
  );
}

function SORoutes() {
  return (
    <SOLayout>
      <Switch>
        <Route path="/so/jobs/:jobId" component={SOJobDetailPage} />
        <Route path="/so/jobs" component={SOJobsPage} />
        <Route path="/so/history" component={SOJobsPage} />
        <Route path="/so">{() => <Redirect to="/so/jobs" />}</Route>
        <Route component={NotFound} />
      </Switch>
    </SOLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Root redirect → /admin */}
      <Route path="/">{() => <Redirect to="/admin" />}</Route>

      {/* Admin auth routes — no AdminLayout, no AdminGuard */}
      <Route path="/admin/login" component={LoginPage} />
      <Route path="/admin/blocked" component={SsoBlockedPage} />
      <Route path="/admin/sso-complete" component={SsoCompletePage} />
      <Route path="/admin/sso-no-account" component={SsoNoAccountPage} />
      <Route path="/admin/forgot-password" component={ForgotPasswordPage} />
      <Route path="/admin/reset-password" component={ResetPasswordPage} />
      <Route path="/admin/role-switch" component={RoleSwitchPage} />

      {/* Legacy /auth/* redirects removed — they were self-referential (/admin/login → /admin/login) */}

      {/* Guest Microsite — mobile-first, no admin chrome */}
      <Route path="/guest/scan/:qrCodeId" component={ScanLandingPage} />
      <Route path="/guest/menu/:sessionId" component={ServiceMenuPage} />
      <Route path="/guest/request/:sessionId" component={RequestPage} />
      <Route path="/guest/track/:requestNumber" component={TrackRequestPage} />
      <Route path="/guest/payment/:requestId" component={PaymentPage} />
      <Route path="/guest/history/:sessionId" component={GuestHistoryPage} />

      {/* Front Office Portal */}
      <Route path="/fo/*">{() => <FORoutes />}</Route>
      <Route path="/fo">{() => <FORoutes />}</Route>

      {/* SP Portal */}
      <Route path="/sp/*">{() => <SPRoutes />}</Route>
      <Route path="/sp">{() => <SPRoutes />}</Route>

      {/* SO Portal */}
      <Route path="/so/*">{() => <SORoutes />}</Route>
      <Route path="/so">{() => <SORoutes />}</Route>

      {/* Admin back-office — all /admin/* routes */}
      <Route path="/admin/*">{() => <AdminRoutes />}</Route>
      <Route path="/admin">{() => <AdminRoutes />}</Route>

      {/* Legacy bare-path redirects — forward bookmarked /rooms/:id etc. to /admin/* */}
      <Route path="/rooms/:id/edit">{(p: { id: string }) => { window.location.replace(`/admin/rooms/${p.id}/edit`); return null; }}</Route>
      <Route path="/rooms/new">{() => { window.location.replace("/admin/rooms/new"); return null; }}</Route>
      <Route path="/rooms/:id">{(p: { id: string }) => { window.location.replace(`/admin/rooms/${p.id}`); return null; }}</Route>
      <Route path="/partners/:id/edit">{(p: { id: string }) => { window.location.replace(`/admin/partners/${p.id}/edit`); return null; }}</Route>
      <Route path="/partners/new">{() => { window.location.replace("/admin/partners/new"); return null; }}</Route>
      <Route path="/partners/:id">{(p: { id: string }) => { window.location.replace(`/admin/partners/${p.id}`); return null; }}</Route>
      <Route path="/properties/:id/edit">{(p: { id: string }) => { window.location.replace(`/admin/properties/${p.id}/edit`); return null; }}</Route>
      <Route path="/properties/new">{() => { window.location.replace("/admin/properties/new"); return null; }}</Route>
      <Route path="/properties/:id">{(p: { id: string }) => { window.location.replace(`/admin/properties/${p.id}`); return null; }}</Route>
      <Route path="/providers/:id/edit">{(p: { id: string }) => { window.location.replace(`/admin/providers/${p.id}/edit`); return null; }}</Route>
      <Route path="/providers/new">{() => { window.location.replace("/admin/providers/new"); return null; }}</Route>
      <Route path="/providers/:id">{(p: { id: string }) => { window.location.replace(`/admin/providers/${p.id}`); return null; }}</Route>
      <Route path="/catalog/:id/edit">{(p: { id: string }) => { window.location.replace(`/admin/catalog/${p.id}/edit`); return null; }}</Route>
      <Route path="/catalog/new">{() => { window.location.replace("/admin/catalog/new"); return null; }}</Route>
      <Route path="/catalog/:id">{(p: { id: string }) => { window.location.replace(`/admin/catalog/${p.id}`); return null; }}</Route>
      <Route path="/templates/:id/edit">{(p: { id: string }) => { window.location.replace(`/admin/templates/${p.id}/edit`); return null; }}</Route>
      <Route path="/templates/new">{() => { window.location.replace("/admin/templates/new"); return null; }}</Route>
      <Route path="/templates/:id">{(p: { id: string }) => { window.location.replace(`/admin/templates/${p.id}`); return null; }}</Route>
      <Route path="/qr/print">{() => { window.location.replace(`/admin/qr/print${window.location.search}`); return null; }}</Route>
      <Route path="/qr/:id/simulate">{(p: { id: string }) => { window.location.replace(`/admin/qr/${p.id}/simulate`); return null; }}</Route>
      <Route path="/qr/:id">{(p: { id: string }) => { window.location.replace(`/admin/qr/${p.id}`); return null; }}</Route>
      <Route path="/users/:id/edit">{(p: { id: string }) => { window.location.replace(`/admin/users/${p.id}/edit`); return null; }}</Route>
      <Route path="/users/:id">{(p: { id: string }) => { window.location.replace(`/admin/users/${p.id}`); return null; }}</Route>
      <Route path="/staff/members/:id/edit">{(p: { id: string }) => { window.location.replace(`/admin/staff/members/${p.id}/edit`); return null; }}</Route>

      {/* Catch-all 404 */}
      <Route component={NotFound} />
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

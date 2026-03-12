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
import UserDetailPage from "./pages/users/UserDetailPage";
import RequestDetailPage from "./pages/frontoffice/RequestDetailPage";

// Guest Microsite Pages
import ScanLandingPage from "./pages/guest/ScanLandingPage";
import ServiceMenuPage from "./pages/guest/ServiceMenuPage";
import RequestPage from "./pages/guest/RequestPage";
import TrackRequestPage from "./pages/guest/TrackRequestPage";

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
        <Route path="/qr/:id" component={QRDetailPage} />

        {/* Front Office */}
        <Route path="/front-office" component={FrontOfficePage} />
        <Route path="/front-office/requests/:id" component={RequestDetailPage} />

        {/* Users */}
        <Route path="/users" component={UsersPage} />
        <Route path="/users/new" component={UserDetailPage} />
        <Route path="/users/:id" component={UserDetailPage} />

        {/* Staff */}
        <Route path="/staff" component={StaffPage} />

        {/* Settings */}
        <Route path="/settings" component={SettingsPage} />

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

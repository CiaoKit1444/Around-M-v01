/**
 * App — Root component with MUI theme, auth, and routing.
 *
 * Architecture:
 * - /auth/* routes render without AdminLayout
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
import LoginPage from "./pages/auth/LoginPage";
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
        <Route path="/" component={DashboardPage} />
        <Route path="/partners" component={PartnersPage} />
        <Route path="/properties" component={PropertiesPage} />
        <Route path="/rooms" component={RoomsPage} />
        <Route path="/providers" component={ProvidersPage} />
        <Route path="/catalog" component={CatalogPage} />
        <Route path="/templates" component={TemplatesPage} />
        <Route path="/qr" component={QRManagementPage} />
        <Route path="/front-office" component={FrontOfficePage} />
        <Route path="/users" component={UsersPage} />
        <Route path="/staff" component={StaffPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth/login" component={LoginPage} />
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

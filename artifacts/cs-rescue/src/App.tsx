import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout, BareLayout } from "@/components/layout/Layout";
import { AdminShell } from "@/components/admin/AdminShell";
import { PersonaProvider } from "@/lib/persona";
import { DemoTour } from "@/components/cs/DemoTour";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Overview from "@/pages/Overview";
import LaunchDemo from "@/pages/LaunchDemo";
import Ceati from "@/pages/Ceati";
import CSHealthScorecard from "@/pages/CSHealthScorecard";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Signals from "@/pages/Signals";
import Playbooks from "@/pages/Playbooks";
import Actions from "@/pages/Actions";
import Reports from "@/pages/Reports";
import LifecycleFunnel from "@/pages/LifecycleFunnel";
import Integrations from "@/pages/Integrations";
import Settings from "@/pages/Settings";
import Architecture from "@/pages/Architecture";
import AICopilot from "@/pages/AICopilot";
import PrenaxExecutiveOverview from "@/pages/prenax/ExecutiveOverview";
import PrenaxPortfolio from "@/pages/prenax/Portfolio";
import PrenaxCustomerDetail from "@/pages/prenax/CustomerDetail";
import PrenaxMethodology from "@/pages/prenax/Methodology";
import PortfolioDashboard from "@/pages/portfolio/PortfolioDashboard";
import PortfolioCompany from "@/pages/portfolio/PortfolioCompany";
import StgJourneyMap from "@/pages/portfolio/StgJourneyMap";
import PortfolioReport from "@/pages/portfolio/PortfolioReport";
import RavigaGameplan from "@/pages/portfolio/RavigaGameplan";
import RavigaFindings from "@/pages/portfolio/RavigaFindings";
import RavigaBenchmarks from "@/pages/portfolio/RavigaBenchmarks";
import RavigaRisk from "@/pages/portfolio/RavigaRisk";
import RavigaDataSources from "@/pages/portfolio/RavigaDataSources";
import AdminFirmsIndex from "@/pages/admin/AdminFirmsIndex";
import AdminPipeline from "@/pages/admin/AdminPipeline";
import AdminInsights from "@/pages/admin/AdminInsights";
import AdminTiers from "@/pages/admin/AdminTiers";
import AdminOutcomes from "@/pages/admin/AdminOutcomes";
import AdminCalibration from "@/pages/admin/AdminCalibration";
import AdminBackengine from "@/pages/admin/AdminBackengine";
import AdminHealth from "@/pages/admin/AdminHealth";
import AdminFirmReviewRedirect from "@/pages/admin/FirmReviewRedirect";
import AdminJobStatus from "@/pages/admin/JobStatus";
import AdminReports from "@/pages/admin/AdminReports";
import { ProtectedRoute } from "@/lib/protected-route";
import { PortfolioDataProvider, PortfolioGate } from "@/data/portfolio/PortfolioDataProvider";

const queryClient = new QueryClient();

// Bare = no sidebar/header (landing & investor pages)
const BARE_PATHS = new Set<string>(["/", "/overview", "/launch-demo", "/ceati", "/cs-health-scorecard"]);

// Pattern: /<firmSlug>/portfolio/... OR /<firmSlug>/findings OR /<firmSlug>/benchmarks OR /<firmSlug>/risk OR /<firmSlug>/data-sources
const FIRM_SCOPED_RE = /^\/[^/]+\/(portfolio|findings|benchmarks|risk|data-sources)(\/|$)/;

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  // Prenax is a fully self-contained prototype with its own chrome.
  if (location === "/prenax" || location.startsWith("/prenax/")) {
    return <>{children}</>;
  }

  // Legacy /portfolio paths (redirected below, but shell still needs to pass them through).
  if (location === "/portfolio" || location.startsWith("/portfolio/")) {
    return <>{children}</>;
  }

  // Firm-scoped portfolio portals — self-contained client chrome.
  if (FIRM_SCOPED_RE.test(location)) {
    return <>{children}</>;
  }

  // Admin surface is the internal platform shell (dark sidebar / light canvas)
  // — never the client-facing demo shell (sidebar + header). Its own routes
  // are still individually gated by ProtectedRoute below.
  if (location === "/admin" || location.startsWith("/admin/")) {
    return <AdminShell>{children}</AdminShell>;
  }

  // Legacy /firms path — redirected to /admin below; pass the Redirect through
  // without wrapping it in the demo Layout chrome.
  if (location === "/firms") {
    return <>{children}</>;
  }

  if (BARE_PATHS.has(location)) {
    return <BareLayout>{children}</BareLayout>;
  }
  return <Layout>{children}</Layout>;
}

function Router() {
  return (
    <Shell>
      <PortfolioGate>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/overview" component={Overview} />
          <Route path="/launch-demo" component={LaunchDemo} />
          <Route path="/ceati" component={Ceati} />
          <Route path="/cs-health-scorecard" component={CSHealthScorecard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/signals" component={Signals} />
          <Route path="/playbooks" component={Playbooks} />
          <Route path="/actions" component={Actions} />
          <Route path="/reports" component={Reports} />
          <Route path="/lifecycle-funnel" component={LifecycleFunnel} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/settings" component={Settings} />
          <Route path="/platform/architecture" component={Architecture} />
          <Route path="/platform/ai-copilot" component={AICopilot} />

          {/* Legacy tenant index — consolidated into /admin. */}
          <Route path="/firms">{() => <Redirect to="/admin" />}</Route>

          {/* Admin platform — gated to csrescue.com Google accounts. Must stay
              above the /:firmSlug/* wildcard routes below or "admin" would be
              swallowed as a firm slug. */}
          <Route path="/admin">
            {() => (
              <ProtectedRoute>
                <AdminFirmsIndex />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/admin/pipeline">
            {() => (
              <ProtectedRoute>
                <AdminPipeline />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/admin/tiers">
            {() => (
              <ProtectedRoute>
                <AdminTiers />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/admin/calibration">
            {() => (
              <ProtectedRoute>
                <AdminCalibration />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/admin/outcomes">
            {() => (
              <ProtectedRoute>
                <AdminOutcomes />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/admin/backengine">
            {() => (
              <ProtectedRoute>
                <AdminBackengine />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/admin/insights">
            {() => (
              <ProtectedRoute>
                <AdminInsights />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/admin/health">
            {() => (
              <ProtectedRoute>
                <AdminHealth />
              </ProtectedRoute>
            )}
          </Route>
          {/* Legacy admin firm list — consolidated into the /admin index. */}
          <Route path="/admin/firms">{() => <Redirect to="/admin" />}</Route>
          {/* Legacy firm-review screen — now the Admin Lens on the tenant
              portal; this only maps the id → its portal and redirects. */}
          <Route path="/admin/firms/:id">
            {() => (
              <ProtectedRoute>
                <AdminFirmReviewRedirect />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/admin/jobs/:id">
            {() => (
              <ProtectedRoute>
                <AdminJobStatus />
              </ProtectedRoute>
            )}
          </Route>
          {/* Legacy per-company report editor route — the editor now lives in
              the tenant portal's Diagnostic Report section; collapse to the
              read-only index. */}
          <Route path="/admin/reports/:companyId">{() => <Redirect to="/admin/reports" />}</Route>
          <Route path="/admin/reports">
            {() => (
              <ProtectedRoute>
                <AdminReports />
              </ProtectedRoute>
            )}
          </Route>

          {/* Firm-scoped portfolio portals — /:firmSlug/portfolio/... */}
          <Route path="/:firmSlug/portfolio" component={PortfolioDashboard} />
          <Route path="/:firmSlug/portfolio/:companyId/gameplan" component={RavigaGameplan} />
          {/* STG-only Admin Lens sandbox (Journey Map look-and-feel test);
              component redirects non-STG firms and non-admin sessions. */}
          <Route path="/:firmSlug/portfolio/:companyId/journey" component={StgJourneyMap} />
          <Route path="/:firmSlug/portfolio/:companyId/report" component={PortfolioReport} />
          <Route path="/:firmSlug/portfolio/:companyId" component={PortfolioCompany} />

          {/* Shared tenant portfolio pages (Findings/Benchmarks now render for every
              firm). Risk & Data Sources remain a Raviga-only sandbox — each
              component redirects non-Raviga firms back to /:firmSlug/portfolio. */}
          <Route path="/:firmSlug/findings" component={RavigaFindings} />
          <Route path="/:firmSlug/benchmarks" component={RavigaBenchmarks} />
          <Route path="/:firmSlug/risk" component={RavigaRisk} />
          <Route path="/:firmSlug/data-sources" component={RavigaDataSources} />

          {/* Legacy /portfolio routes — 301-redirect to /stg equivalents */}
          <Route path="/portfolio">
            {() => <Redirect to="/stg/portfolio" />}
          </Route>
          <Route path="/portfolio/:companyId/report">
            {(params) => <Redirect to={`/stg/portfolio/${params?.companyId}/report`} />}
          </Route>
          <Route path="/portfolio/:companyId">
            {(params) => <Redirect to={`/stg/portfolio/${params?.companyId}`} />}
          </Route>

          {/* Prenax Customer Health Intelligence — self-contained prototype */}
          <Route path="/prenax" component={PrenaxExecutiveOverview} />
          <Route path="/prenax/portfolio" component={PrenaxPortfolio} />
          <Route path="/prenax/methodology" component={PrenaxMethodology} />
          <Route path="/prenax/customers/:id" component={PrenaxCustomerDetail} />

          {/* Archived routes redirect to the narrative overview */}
          <Route path="/resources">{() => <Redirect to="/overview" />}</Route>
          <Route path="/deployments">{() => <Redirect to="/overview" />}</Route>
          <Route path="/connectors">{() => <Redirect to="/overview" />}</Route>
          {/* Old AI Copilot path — keep deep-link query params working */}
          <Route path="/ai-copilot">
            {() => <Redirect to={`/platform/ai-copilot${typeof window !== "undefined" ? window.location.search : ""}`} />}
          </Route>

          <Route component={NotFound} />
        </Switch>
      </PortfolioGate>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PersonaProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <PortfolioDataProvider>
              <Router />
              <DemoTour />
            </PortfolioDataProvider>
          </WouterRouter>
          <Toaster />
        </PersonaProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

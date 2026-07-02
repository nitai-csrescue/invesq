import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout, BareLayout } from "@/components/layout/Layout";
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
import PortfolioReport from "@/pages/portfolio/PortfolioReport";

const queryClient = new QueryClient();

// Bare = no sidebar/header (landing & investor pages)
const BARE_PATHS = new Set<string>(["/", "/overview", "/launch-demo", "/ceati", "/cs-health-scorecard"]);

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  // Prenax is a fully self-contained prototype with its own chrome.
  if (location === "/prenax" || location.startsWith("/prenax/")) {
    return <>{children}</>;
  }
  // Portfolio Rollup is a self-contained client portal with its own chrome.
  if (location === "/portfolio" || location.startsWith("/portfolio/")) {
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

        {/* Portfolio Rollup — self-contained STG client portal */}
        <Route path="/portfolio" component={PortfolioDashboard} />
        <Route path="/portfolio/:companyId/report" component={PortfolioReport} />
        <Route path="/portfolio/:companyId" component={PortfolioCompany} />

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
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PersonaProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
            <DemoTour />
          </WouterRouter>
          <Toaster />
        </PersonaProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

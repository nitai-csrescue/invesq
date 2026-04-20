import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { PersonaProvider } from "@/lib/persona";
import NotFound from "@/pages/not-found";

import Architecture from "@/pages/Architecture";
import Resources from "@/pages/Resources";
import Deployments from "@/pages/Deployments";
import Connectors from "@/pages/Connectors";
import AICopilot from "@/pages/AICopilot";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Architecture} />
        <Route path="/resources" component={Resources} />
        <Route path="/deployments" component={Deployments} />
        <Route path="/connectors" component={Connectors} />
        <Route path="/ai-copilot" component={AICopilot} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PersonaProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </PersonaProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
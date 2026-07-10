import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetGraph,
  getGetGraphQueryKey,
  useListResources,
  getListResourcesQueryKey,
  type Account as ApiAccount,
} from "@workspace/api-client-react";
import { usePersona, PERSONAS, type Persona } from "@/lib/persona";
import { AICopilotInputPanel } from "@/components/ai/AICopilotInputPanel";
import { AICopilotOutput } from "@/components/ai/AICopilotOutput";
import { generateBriefing, type Briefing, type Goal, type Scope } from "@/services/ai/generateBriefing";
import { accounts as demoAccounts, type Account as DemoAccount } from "@/data/accounts";
import { demoDeployments } from "@/data/deployments";

// Map the cohesive demo-universe accounts (src/data/accounts.ts) onto the
// API Account shape that the briefing pipeline expects. This lets Copilot's
// pickers and deep-links use the same 18 named accounts as the rest of the
// product (Dashboard, Accounts, Signals).
function toApiAccount(a: DemoAccount): ApiAccount {
  const segment =
    a.segment === "Enterprise"
      ? "enterprise"
      : a.segment === "Mid-Market"
        ? "mid_market"
        : "smb";
  const status =
    a.status === "at-risk" || a.status === "churning" ? "at_risk" : "active";
  // Demo accounts are all live customers in active CSM motion. Pick a
  // lifecycleStage that drives meaningful signal phrasing.
  const lifecycleStage = "csm";
  return {
    id: a.id,
    name: a.name,
    segment,
    lifecycleStage,
    deploymentIds: [],
    owner: a.ownerId,
    status,
    industry: a.industry,
    arr: a.arr,
  };
}

const DEMO_API_ACCOUNTS: ApiAccount[] = demoAccounts.map(toApiAccount);

export default function AICopilot() {
  const { persona, setPersona } = usePersona();

  const { data: graph, isLoading: graphLoading } = useGetGraph({
    query: { queryKey: getGetGraphQueryKey() },
  });
  // Picker and selected-account lookup use the cohesive demo universe
  // (Wayne Enterprises, Stark Industries, …) so deep-links from Dashboard /
  // Signals / Accounts resolve to a real named account.
  const accounts = DEMO_API_ACCOUNTS;
  // Deployments come from the same demo universe — each demo account has one
  // or more named rollouts (e.g. Wayne Enterprises → "Wayne Auth Modernization").
  // This keeps the Deployment dropdown and the briefing pipeline end-to-end
  // consistent with the account picker.
  const deployments = demoDeployments;
  const { data: resources = [] } = useListResources(undefined, {
    query: { queryKey: getListResourcesQueryKey() },
  });

  // Default scope = Company so the user gets value immediately without picking an account.
  const [scope, setScope] = useState<Scope>("company");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [goal, setGoal] = useState<Goal>("Executive Review");
  const [prompt, setPrompt] = useState("");

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // The Customer persona is an outside-in single-customer lens; the Company
  // (book-of-business) scope doesn't make sense for it. Force Customer scope
  // whenever the persona flips to "customer".
  useEffect(() => {
    if (persona === "customer" && scope !== "customer") {
      setScope("customer");
    }
  }, [persona, scope]);

  // Default selections once data arrives (only matter for customer scope)
  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  useEffect(() => {
    if (deploymentId) return;
    if (!accountId) {
      if (deployments.length > 0) setDeploymentId(deployments[0].id);
      return;
    }
    const match = deployments.find((d) => d.accountId === accountId);
    if (match) setDeploymentId(match.id);
  }, [accountId, deployments, deploymentId]);

  const account = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );
  const deployment = useMemo(
    () => deployments.find((d) => d.id === deploymentId) ?? null,
    [deployments, deploymentId],
  );

  async function onGenerate() {
    if (!graph) return;
    setIsGenerating(true);
    try {
      const result = await generateBriefing({
        persona,
        scope,
        account: scope === "company" ? null : account,
        deployment: scope === "company" ? null : deployment,
        goal,
        prompt,
        nodes: graph.nodes,
        edges: graph.edges,
        resources,
        // Company-scope aggregation walks deployments and looks up their
        // parent account by id. Both lists now come from the demo universe
        // so the rollup matches what the picker exposes.
        accounts,
        deployments,
      });
      setBriefing(result);
    } finally {
      setIsGenerating(false);
    }
  }

  // Read URL query params for deep-link from Dashboard insight rail:
  //   ?prompt=...&accountId=...&persona=...&autoRun=1
  const deepLink = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const p = params.get("prompt");
    const aId = params.get("accountId");
    const dId = params.get("deploymentId");
    const personaParam = params.get("persona");
    const auto = params.get("autoRun") === "1";
    if (!p && !aId && !dId && !auto && !personaParam) return null;
    return { prompt: p ?? "", accountId: aId, deploymentId: dId, persona: personaParam, autoRun: auto };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply deep-link prompt + scope + persona as soon as we mount.
  useEffect(() => {
    if (!deepLink) return;
    if (deepLink.prompt) setPrompt(deepLink.prompt);
    if (deepLink.accountId) {
      setScope("customer");
      setAccountId(deepLink.accountId);
    }
    if (deepLink.deploymentId) setDeploymentId(deepLink.deploymentId);
    if (deepLink.persona && PERSONAS.some((p) => p.id === deepLink.persona)) {
      setPersona(deepLink.persona as Persona);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate the first briefing once data is ready, optionally honoring a deep-link.
  const didAutoGenerate = useRef(false);
  useEffect(() => {
    if (didAutoGenerate.current) return;
    if (graphLoading || !graph) return;
    if (deployments.length === 0) return;
    // If deep-link asked us not to auto-run, skip.
    if (deepLink && !deepLink.autoRun) return;
    // For deep-link with a customer-scoped account, wait until accountId resolves.
    if (deepLink?.accountId && accountId !== deepLink.accountId) return;
    didAutoGenerate.current = true;
    void onGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphLoading, graph, deployments.length, accountId, deepLink]);

  return (
    <div className="h-full flex flex-col lg:flex-row" data-testid="ai-copilot-page">
      <AICopilotInputPanel
        persona={persona}
        setPersona={setPersona}
        scope={scope}
        setScope={setScope}
        accountId={accountId}
        setAccountId={setAccountId}
        deploymentId={deploymentId}
        setDeploymentId={setDeploymentId}
        goal={goal}
        setGoal={setGoal}
        prompt={prompt}
        setPrompt={setPrompt}
        accounts={accounts}
        deployments={deployments}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
        disabled={graphLoading || !graph}
      />
      <AICopilotOutput
        briefing={briefing}
        isGenerating={isGenerating}
        nodes={graph?.nodes ?? []}
        resources={resources}
      />
    </div>
  );
}

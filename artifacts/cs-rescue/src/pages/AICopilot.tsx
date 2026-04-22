import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetGraph,
  getGetGraphQueryKey,
  useListAccounts,
  getListAccountsQueryKey,
  useListDeployments,
  getListDeploymentsQueryKey,
  useListResources,
  getListResourcesQueryKey,
} from "@workspace/api-client-react";
import { usePersona } from "@/lib/persona";
import { AICopilotInputPanel } from "@/components/ai/AICopilotInputPanel";
import { AICopilotOutput } from "@/components/ai/AICopilotOutput";
import { generateBriefing, type Briefing, type Goal, type Scope } from "@/services/ai/generateBriefing";

export default function AICopilot() {
  const { persona, setPersona } = usePersona();

  const { data: graph, isLoading: graphLoading } = useGetGraph({
    query: { queryKey: getGetGraphQueryKey() },
  });
  const { data: accounts = [] } = useListAccounts({
    query: { queryKey: getListAccountsQueryKey() },
  });
  const { data: deployments = [] } = useListDeployments(undefined, {
    query: { queryKey: getListDeploymentsQueryKey() },
  });
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
        accounts,
        deployments,
      });
      setBriefing(result);
    } finally {
      setIsGenerating(false);
    }
  }

  // Read URL query params for deep-link from Dashboard insight rail:
  //   ?prompt=...&accountId=...&autoRun=1
  const deepLink = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const p = params.get("prompt");
    const aId = params.get("accountId");
    const auto = params.get("autoRun") === "1";
    if (!p && !aId && !auto) return null;
    return { prompt: p ?? "", accountId: aId, autoRun: auto };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply deep-link prompt + scope as soon as we mount.
  useEffect(() => {
    if (!deepLink) return;
    if (deepLink.prompt) setPrompt(deepLink.prompt);
    if (deepLink.accountId) {
      setScope("customer");
      setAccountId(deepLink.accountId);
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

import { useEffect, useMemo, useState } from "react";
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
import { generateBriefing, type Briefing, type Goal } from "@/services/ai/generateBriefing";

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

  const [accountId, setAccountId] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [goal, setGoal] = useState<Goal>("Executive Review");
  const [prompt, setPrompt] = useState("");

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Default selections once data arrives
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
        account,
        deployment,
        goal,
        prompt,
        nodes: graph.nodes,
        edges: graph.edges,
        resources,
      });
      setBriefing(result);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="h-full flex flex-col lg:flex-row" data-testid="ai-copilot-page">
      <AICopilotInputPanel
        persona={persona}
        setPersona={setPersona}
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

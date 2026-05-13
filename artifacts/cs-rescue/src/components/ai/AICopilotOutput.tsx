import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  Sparkles,
  AlertTriangle,
  Target,
  TrendingUp,
  Network,
  Footprints,
  CheckSquare,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import type { ArchitectureNode, Resource } from "@workspace/api-client-react";
import { BriefingCard, BulletList } from "./BriefingCard";
import type { Briefing } from "@/services/ai/generateBriefing";
import { PERSONAS } from "@/lib/persona";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  briefing: Briefing | null;
  isGenerating: boolean;
  nodes: ArchitectureNode[];
  resources: Resource[];
}

export function AICopilotOutput({ briefing, isGenerating, nodes, resources }: Props) {
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  const personaLabel = useMemo(
    () => (briefing ? PERSONAS.find((p) => p.id === briefing.persona)?.label ?? briefing.persona : ""),
    [briefing],
  );

  const recommendedNodes = useMemo(() => {
    if (!briefing) return [];
    return briefing.recommendedNodeIds
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n): n is ArchitectureNode => Boolean(n));
  }, [briefing, nodes]);

  const recommendedResources = useMemo(() => {
    if (!briefing) return [];
    return briefing.recommendedResourceIds
      .map((id) => resources.find((r) => r.id === id))
      .filter((r): r is Resource => Boolean(r));
  }, [briefing, resources]);

  if (!briefing && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-12">
        <div className="max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-400/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-cyan-300" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No briefing yet</h2>
          <p className="text-sm text-slate-400">
            Pick a persona and goal on the left, then hit <span className="text-white font-medium">Generate Briefing</span> to
            create a tailored demo summary tied to your live architecture.
          </p>
        </div>
      </div>
    );
  }

  if (isGenerating && !briefing) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-12">
        <div className="flex items-center gap-3 text-slate-300">
          <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
          <span>Synthesising briefing…</span>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  function copySummary() {
    if (!briefing) return;
    const lines = [
      `INVESQ briefing — ${personaLabel} · ${briefing.goal}`,
      "",
      `Summary: ${briefing.summary}`,
      "",
      "Top priorities:",
      ...briefing.priorities.map((p) => `  • ${p.text}`),
      "",
      "Top risks:",
      ...briefing.risks.map((r) => `  • ${r.text}`),
      "",
      "Opportunities:",
      ...briefing.opportunities.map((o) => `  • ${o.text}`),
      "",
      "Walkthrough:",
      ...briefing.walkthroughSteps.map((s) => `  ${s.text}`),
      "",
      "Next actions:",
      ...briefing.nextActions.map((a) => `  • ${a.text}`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function openRecommendedView() {
    if (!briefing) return;
    sessionStorage.setItem(
      "cs-rescue:highlight",
      JSON.stringify({
        nodeIds: briefing.recommendedNodeIds,
        edgeIds: briefing.recommendedEdgeIds,
        resourceIds: briefing.recommendedResourceIds,
        persona: briefing.persona,
        viewMode: "business",
        reason: "AI_COPILOT",
        goal: briefing.goal,
        ts: Date.now(),
      }),
    );
    navigate("/");
  }

  return (
    <div className="flex-1 overflow-y-auto" data-testid="copilot-output">
      <div className="max-w-5xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">
                Briefing · {briefing.goal}
              </p>
              <span
                data-testid="copilot-scope-badge"
                className={cn(
                  "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                  briefing.scope === "company"
                    ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-200"
                    : "bg-indigo-500/15 border-indigo-400/40 text-indigo-200",
                )}
              >
                {briefing.scope === "company"
                  ? `Company · ${briefing.deploymentsCovered} deployments`
                  : "Customer"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">For the {personaLabel}</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">{briefing.summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copySummary}
              data-testid="copilot-copy"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                copied
                  ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                  : "bg-slate-900/60 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800/80",
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy demo summary"}
            </button>
            <button
              onClick={openRecommendedView}
              data-testid="copilot-open-recommended"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Open recommended view
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BriefingCard title="Priorities" accent="cyan" icon={<Target className="w-full h-full" />}>
            <BulletList items={briefing.priorities} />
          </BriefingCard>

          <BriefingCard title="Risks" accent="rose" icon={<AlertTriangle className="w-full h-full" />}>
            <BulletList items={briefing.risks} />
          </BriefingCard>

          <BriefingCard title="Opportunities" accent="emerald" icon={<TrendingUp className="w-full h-full" />}>
            <BulletList items={briefing.opportunities} />
          </BriefingCard>

          <BriefingCard title="Recommended Architecture Focus" accent="purple" icon={<Network className="w-full h-full" />}>
            {recommendedNodes.length === 0 ? (
              <p className="text-slate-500 italic">No nodes flagged.</p>
            ) : (
              <ul className="space-y-2">
                {recommendedNodes.map((n) => {
                  const score = n.healthScore ?? 100;
                  const dot =
                    score >= 85 ? "bg-emerald-400" : score >= 70 ? "bg-amber-400" : "bg-rose-400";
                  return (
                    <li
                      key={n.id}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-slate-900/60 border border-white/5"
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
                      <span className="text-sm text-white font-medium truncate">{n.name}</span>
                      {n.ownerTeam && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 border border-white/10 text-slate-300 truncate max-w-[140px]">
                          {n.ownerTeam}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto">{score}%</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {recommendedResources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                  Related systems
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedResources.map((r) => (
                    <span
                      key={r.id}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-400/30 text-purple-200"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </BriefingCard>

          <BriefingCard
            title="Suggested Walkthrough"
            accent="indigo"
            icon={<Footprints className="w-full h-full" />}
            className="md:col-span-2"
          >
            <ol className="space-y-2">
              {briefing.walkthroughSteps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="leading-relaxed">{s.text}</span>
                    {s.sources.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.sources.slice(0, 3).map((src, j) => (
                          <span
                            key={j}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-400/30 text-cyan-200"
                          >
                            {src.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </BriefingCard>

          <BriefingCard
            title="Next Actions"
            accent="amber"
            icon={<CheckSquare className="w-full h-full" />}
            className="md:col-span-2"
          >
            <BulletList items={briefing.nextActions} />
          </BriefingCard>
        </div>

        {/* Signals footer — explains why this output looks the way it does */}
        <div className="mt-6 px-4 py-3 rounded-lg border border-white/10 bg-slate-900/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span className="text-slate-500 uppercase tracking-wider font-semibold">Signals scanned</span>
          <span><span className="text-white font-semibold">{briefing.signalStats.total}</span> total</span>
          <span><span className="text-rose-300 font-semibold">{briefing.signalStats.risk}</span> risk</span>
          <span><span className="text-cyan-300 font-semibold">{briefing.signalStats.priority}</span> priority</span>
          <span><span className="text-emerald-300 font-semibold">{briefing.signalStats.opportunity}</span> opportunity</span>
          <span className="ml-auto italic text-slate-500">
            Output is deterministic today — same inputs, same briefing. Swappable for an LLM later.
          </span>
        </div>
      </div>
    </div>
  );
}

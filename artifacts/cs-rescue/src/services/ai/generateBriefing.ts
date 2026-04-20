import type {
  Account,
  ArchitectureEdge,
  ArchitectureNode,
  Deployment,
  Resource,
} from "@workspace/api-client-react";
import type { Persona } from "@/lib/persona";
import {
  scoreSignals,
  topByKind,
  getPersonaNodeBias,
  type Signal,
  type SignalSource,
} from "./scoreSignals";

export type Goal =
  | "Executive Review"
  | "Deal Strategy"
  | "Rollout Checkpoint"
  | "Renewal Risk Review"
  | "Support Escalation Review"
  | "Technical Dependency Review";

export const GOALS: Goal[] = [
  "Executive Review",
  "Deal Strategy",
  "Rollout Checkpoint",
  "Renewal Risk Review",
  "Support Escalation Review",
  "Technical Dependency Review",
];

export interface BriefingInput {
  persona: Persona;
  account: Account | null;
  deployment: Deployment | null;
  goal: Goal;
  prompt?: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  resources: Resource[];
}

/** Each line carries the evidence chips that produced it. */
export interface BriefingItem {
  text: string;
  sources: SignalSource[];
}

export interface Briefing {
  persona: Persona;
  accountId: string | null;
  deploymentId: string | null;
  goal: Goal;
  generatedAt: string;
  summary: string;
  priorities: BriefingItem[];
  risks: BriefingItem[];
  opportunities: BriefingItem[];
  recommendedNodeIds: string[];
  recommendedEdgeIds: string[];
  recommendedResourceIds: string[];
  walkthroughSteps: BriefingItem[];
  nextActions: BriefingItem[];
  /** Counts driving the "why this output" footer. */
  signalStats: { total: number; risk: number; priority: number; opportunity: number };
}

const PERSONA_LENS: Record<
  Persona,
  { audience: string; focus: string; tone: string }
> = {
  vp: {
    audience: "executive sponsor",
    focus: "business impact, deployment risk, adoption health",
    tone: "concise, outcome-oriented",
  },
  sales: {
    audience: "account executive",
    focus: "deal readiness, scope risk, handoff confidence",
    tone: "commercial, urgency-aware",
  },
  "post-sales": {
    audience: "implementation lead",
    focus: "rollout health, milestones, blockers, enablement",
    tone: "operational, milestone-driven",
  },
  cs: {
    audience: "customer success manager",
    focus: "adoption, renewal risk, expansion signals",
    tone: "relationship-led, proactive",
  },
  support: {
    audience: "support lead",
    focus: "case volume, escalations, impacted systems",
    tone: "operational, root-cause oriented",
  },
  engineering: {
    audience: "platform engineering lead",
    focus: "dependencies, degraded systems, integration risk",
    tone: "technical, dependency-aware",
  },
};

function toItem(s: Signal): BriefingItem {
  return { text: s.text, sources: s.sources };
}

function applyPromptOverlay(
  items: BriefingItem[],
  prompt: string | undefined,
  kind: "priority" | "risk" | "opportunity",
): BriefingItem[] {
  const trimmed = prompt?.trim();
  if (!trimmed) return items;
  const lower = trimmed.toLowerCase();
  const targets: Record<string, string[]> = {
    priority: ["priorit", "focus", "summary", "summarize", "summarise", "demo", "agenda"],
    risk: ["risk", "blocker", "concern", "issue", "escalation", "outage", "degrad"],
    opportunity: ["opportunit", "expansion", "upsell", "renewal", "advoc", "case study", "expand"],
  };
  const matches = targets[kind].some((kw) => lower.includes(kw));
  if (matches || (kind === "priority" && items.length < 4)) {
    const label =
      kind === "priority" ? "User focus" : kind === "risk" ? "User-flagged risk" : "User-flagged opportunity";
    return [{ text: `${label}: ${trimmed}`, sources: [] }, ...items].slice(0, 5);
  }
  return items;
}

function pickRecommendedNodes(
  signals: Signal[],
  persona: Persona,
  nodes: ArchitectureNode[],
  limit = 5,
): ArchitectureNode[] {
  const scored = new Map<string, number>();
  // Add weight from signals
  for (const s of signals.slice(0, 12)) {
    for (const id of s.nodeIds ?? []) {
      scored.set(id, (scored.get(id) ?? 0) + s.weight);
    }
  }
  // Persona bias as floor weight
  for (const id of getPersonaNodeBias(persona)) {
    scored.set(id, (scored.get(id) ?? 0) + 0.5);
  }
  const visible = nodes.filter((n) => {
    if (!n.visibleToPersonas?.length) return true;
    return n.visibleToPersonas.includes(persona);
  });
  return [...visible]
    .sort((a, b) => {
      const sa = scored.get(a.id) ?? 0;
      const sb = scored.get(b.id) ?? 0;
      if (sa !== sb) return sb - sa;
      return (a.healthScore ?? 100) - (b.healthScore ?? 100);
    })
    .slice(0, limit);
}

function buildPriorities(signals: Signal[], goal: Goal, account: Account | null, deployment: Deployment | null): BriefingItem[] {
  const acct = account?.name ?? "the account";
  const dep = deployment?.name ?? "the active rollout";

  // Goal-anchored opening priority (no sources — it's the framing line)
  const goalPriorities: Record<Goal, string> = {
    "Executive Review": `Frame ${acct} progress against the original business case.`,
    "Deal Strategy": `Validate scope and commercial assumptions for ${acct}.`,
    "Rollout Checkpoint": `Walk every milestone in ${dep} and surface slips.`,
    "Renewal Risk Review": `Score adoption against the original success plan.`,
    "Support Escalation Review": `Cluster active escalations by impacted system.`,
    "Technical Dependency Review": `Map current degraded systems to downstream consumers.`,
  };
  const seedSources: SignalSource[] = [];
  if (deployment) seedSources.push({ kind: "deployment", id: deployment.id, label: deployment.name });
  if (account) seedSources.push({ kind: "account", id: account.id, label: account.name });
  const seed: BriefingItem = { text: goalPriorities[goal], sources: seedSources };

  const fromSignals = topByKind(signals, "priority", 3).map(toItem);
  return [seed, ...fromSignals].slice(0, 4);
}

function buildWalkthrough(persona: Persona, recommended: ArchitectureNode[], goal: Goal): BriefingItem[] {
  const lens = PERSONA_LENS[persona];
  const out: BriefingItem[] = [
    {
      text: `Open with a one-line framing for the ${lens.audience}: ${lens.focus}.`,
      sources: [],
    },
  ];
  recommended.slice(0, 3).forEach((n, i) => {
    const ownerSuffix = n.ownerTeam ? ` (owned by ${n.ownerTeam})` : "";
    out.push({
      text: `${i + 1}. Open ${n.name}${ownerSuffix} — show its ${
        n.healthScore !== undefined ? `${n.healthScore}% health` : "current state"
      } and the ${lens.tone.split(",")[0]} signal.`,
      sources: [{ kind: "node", id: n.id, label: n.name }],
    });
  });
  out.push({
    text: `Close with the recommended next action tied to the ${goal.toLowerCase()}.`,
    sources: [],
  });
  return out;
}

function buildNextActions(persona: Persona, deployment: Deployment | null, goal: Goal): BriefingItem[] {
  const out: BriefingItem[] = [];
  if (deployment) {
    const depSrc: SignalSource = { kind: "deployment", id: deployment.id, label: deployment.name };
    const openHigh = deployment.blockers?.find((b) => b.severity === "high" && b.status !== "resolved");
    if (openHigh) {
      out.push({
        text: `Drive resolution on: ${openHigh.description}${openHigh.owner ? ` (owner: ${openHigh.owner})` : ""}.`,
        sources: [depSrc, { kind: "blocker", id: openHigh.id, label: openHigh.description }],
      });
    }
    const nextMs = deployment.milestones?.find((m) => m.status !== "completed");
    if (nextMs) {
      out.push({
        text: `Confirm path to milestone "${nextMs.name}"${nextMs.dueDate ? ` by ${nextMs.dueDate}` : ""}.`,
        sources: [depSrc, { kind: "milestone", id: nextMs.id, label: nextMs.name }],
      });
    }
  }
  const personaActions: Record<Persona, string> = {
    vp: "Draft a 5-line summary for Monday exec sync.",
    sales: "Schedule the next champion call this week.",
    cs: "Update the success plan and share with sponsor.",
    support: "Open a war-room channel for the top escalation cluster.",
    engineering: "File mitigation tickets for each degraded dependency.",
    "post-sales": "Lock the next milestone owner per workstream.",
  };
  out.push({ text: personaActions[persona], sources: [] });
  out.push({ text: `Re-run the ${goal} briefing in 7 days to track movement.`, sources: [] });
  return out.slice(0, 5);
}

function summarise(input: BriefingInput, recommended: ArchitectureNode[], signals: Signal[]): string {
  const lens = PERSONA_LENS[input.persona];
  const acct = input.account?.name ?? "the active account";
  const dep = input.deployment;
  const depPhrase = dep ? `${dep.name} is at ${dep.healthScore}% health` : "no active deployment is selected";
  const topRisk = signals.find((s) => s.kind === "risk");
  const topNode = recommended[0];
  const tail =
    topRisk
      ? `Top risk: ${topRisk.text}`
      : topNode
        ? `Watch ${topNode.name}${topNode.healthScore !== undefined ? ` (${topNode.healthScore}%)` : ""} closely.`
        : "Architecture is stable across the persona-relevant slice.";
  return `For the ${lens.audience} on ${acct}: ${depPhrase}. Focus is ${lens.focus}. ${tail}`;
}

/**
 * Generate a persona-aware briefing from existing mock data.
 *
 * STAGE 1: deterministic signal-driven generator (current).
 * STAGE 2: swap this function body for a real LLM call — the input/output
 * shapes and Signal contract are the API surface to preserve.
 */
export async function generateBriefing(input: BriefingInput): Promise<Briefing> {
  await new Promise((r) => setTimeout(r, 300));

  const signals = scoreSignals({
    persona: input.persona,
    account: input.account,
    deployment: input.deployment,
    nodes: input.nodes,
    edges: input.edges,
    resources: input.resources,
  });

  const recommended = pickRecommendedNodes(signals, input.persona, input.nodes, 5);

  // Recommended edges come from the highest-impact signals (e.g. degraded deps)
  const recommendedEdgeIds = Array.from(
    new Set(signals.slice(0, 8).flatMap((s) => s.edgeIds ?? [])),
  ).slice(0, 6);

  const recommendedResourceIds = Array.from(
    new Set([
      ...signals.slice(0, 8).flatMap((s) => s.resourceIds ?? []),
      ...recommended.flatMap((n) => n.resourceIds ?? []),
    ]),
  ).slice(0, 5);

  const stats = {
    total: signals.length,
    risk: signals.filter((s) => s.kind === "risk").length,
    priority: signals.filter((s) => s.kind === "priority").length,
    opportunity: signals.filter((s) => s.kind === "opportunity").length,
  };

  return {
    persona: input.persona,
    accountId: input.account?.id ?? null,
    deploymentId: input.deployment?.id ?? null,
    goal: input.goal,
    generatedAt: new Date().toISOString(),
    summary: summarise(input, recommended, signals),
    priorities: applyPromptOverlay(
      buildPriorities(signals, input.goal, input.account, input.deployment),
      input.prompt,
      "priority",
    ),
    risks: applyPromptOverlay(topByKind(signals, "risk", 3).map(toItem), input.prompt, "risk"),
    opportunities: applyPromptOverlay(
      topByKind(signals, "opportunity", 3).map(toItem),
      input.prompt,
      "opportunity",
    ),
    recommendedNodeIds: recommended.map((n) => n.id),
    recommendedEdgeIds,
    recommendedResourceIds,
    walkthroughSteps: buildWalkthrough(input.persona, recommended, input.goal),
    nextActions: buildNextActions(input.persona, input.deployment, input.goal),
    signalStats: stats,
  };
}

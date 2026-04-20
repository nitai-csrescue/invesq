import type {
  Account,
  ArchitectureNode,
  Deployment,
  Resource,
} from "@workspace/api-client-react";
import type { Persona } from "@/lib/persona";

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
  resources: Resource[];
}

export interface Briefing {
  persona: Persona;
  accountId: string | null;
  deploymentId: string | null;
  goal: Goal;
  generatedAt: string;
  summary: string;
  priorities: string[];
  risks: string[];
  opportunities: string[];
  recommendedNodeIds: string[];
  recommendedResourceIds: string[];
  walkthroughSteps: string[];
  nextActions: string[];
}

// ── Persona helpers ────────────────────────────────────────────────────────

const PERSONA_LENS: Record<
  Persona,
  { audience: string; focus: string; tone: string; nodeBias: string[] }
> = {
  vp: {
    audience: "executive sponsor",
    focus: "business impact, deployment risk, adoption health",
    tone: "concise, outcome-oriented",
    nodeBias: ["node-implementation", "node-csm", "node-deployment-intelligence", "node-analytics"],
  },
  sales: {
    audience: "account executive",
    focus: "deal readiness, scope risk, handoff confidence",
    tone: "commercial, urgency-aware",
    nodeBias: ["node-pre-sales", "node-contract", "node-implementation", "node-crm", "node-partner-hub"],
  },
  "post-sales": {
    audience: "implementation lead",
    focus: "rollout health, milestones, blockers, enablement",
    tone: "operational, milestone-driven",
    nodeBias: ["node-implementation", "node-forward-deployed", "node-lifecycle-playbooks", "node-deployment-intelligence"],
  },
  cs: {
    audience: "customer success manager",
    focus: "adoption, renewal risk, expansion signals",
    tone: "relationship-led, proactive",
    nodeBias: ["node-csm", "node-analytics", "node-lifecycle-playbooks", "node-crm", "node-support"],
  },
  support: {
    audience: "support lead",
    focus: "case volume, escalations, impacted systems",
    tone: "operational, root-cause oriented",
    nodeBias: ["node-support", "node-case-management", "node-document", "node-api-gateway"],
  },
  engineering: {
    audience: "platform engineering lead",
    focus: "dependencies, degraded systems, integration risk",
    tone: "technical, dependency-aware",
    nodeBias: ["node-api-gateway", "node-data-orchestration", "node-decisioning", "node-deployment-intelligence", "node-compliance"],
  },
};

function healthBucket(score: number): "healthy" | "warning" | "at-risk" {
  if (score >= 85) return "healthy";
  if (score >= 70) return "warning";
  return "at-risk";
}

function pickRelevantNodes(persona: Persona, nodes: ArchitectureNode[], limit = 5): ArchitectureNode[] {
  const bias = PERSONA_LENS[persona].nodeBias;
  const visible = nodes.filter((n) => {
    if (!n.visibleToPersonas || n.visibleToPersonas.length === 0) return true;
    return n.visibleToPersonas.includes(persona);
  });
  // Sort: biased nodes first, then by descending priority for persona, then health risk
  return [...visible]
    .sort((a, b) => {
      const aBias = bias.indexOf(a.id);
      const bBias = bias.indexOf(b.id);
      if (aBias !== bBias) {
        if (aBias === -1) return 1;
        if (bBias === -1) return -1;
        return aBias - bBias;
      }
      const aP = a.defaultPriorityByPersona?.[persona] ?? "secondary";
      const bP = b.defaultPriorityByPersona?.[persona] ?? "secondary";
      const order: Record<string, number> = { primary: 0, secondary: 1, hidden: 2 };
      if (order[aP] !== order[bP]) return order[aP] - order[bP];
      return (a.healthScore ?? 100) - (b.healthScore ?? 100);
    })
    .slice(0, limit);
}

function topRisks(persona: Persona, nodes: ArchitectureNode[], deployment: Deployment | null): string[] {
  const risks: string[] = [];
  const visibleNodes = nodes.filter((n) =>
    !n.visibleToPersonas?.length || n.visibleToPersonas.includes(persona),
  );
  const atRisk = visibleNodes
    .filter((n) => (n.healthScore ?? 100) < 80)
    .sort((a, b) => (a.healthScore ?? 100) - (b.healthScore ?? 100));

  for (const n of atRisk.slice(0, 2)) {
    const bucket = healthBucket(n.healthScore ?? 100);
    risks.push(
      `${n.name} is ${bucket} at ${n.healthScore ?? "—"}% health — ${
        bucket === "at-risk" ? "needs immediate attention" : "trending toward degradation"
      }.`,
    );
  }

  if (deployment) {
    const openBlockers = deployment.blockers?.filter((b) => b.status !== "resolved") ?? [];
    if (openBlockers.length > 0) {
      const top = openBlockers.find((b) => b.severity === "high") ?? openBlockers[0];
      risks.push(`Deployment blocker: ${top.description} (${top.severity}).`);
    }
    if (deployment.healthScore < 75) {
      risks.push(`Deployment health is ${deployment.healthScore}% — below the 75% comfort threshold.`);
    }
  }

  // Persona-specific colour
  if (persona === "engineering" || persona === "post-sales") {
    const api = nodes.find((n) => n.id === "node-api-gateway");
    if (api && (api.healthScore ?? 100) < 95) {
      risks.push(`API Gateway at ${api.healthScore}% — integration risk for downstream consumers.`);
    }
  }
  if (persona === "support" || persona === "cs") {
    const cm = nodes.find((n) => n.id === "node-case-management");
    if (cm && (cm.healthScore ?? 100) < 80) {
      risks.push(`Case Management strain at ${cm.healthScore}% — escalation pressure rising.`);
    }
  }

  return risks.slice(0, 3);
}

function topOpportunities(persona: Persona, nodes: ArchitectureNode[], deployment: Deployment | null): string[] {
  const ops: string[] = [];
  const csm = nodes.find((n) => n.id === "node-csm");
  const analytics = nodes.find((n) => n.id === "node-analytics");

  if (persona === "vp" || persona === "cs" || persona === "sales") {
    if (csm && (csm.healthScore ?? 0) >= 85) {
      ops.push("CSM motion strong — ready to surface expansion plays in next QBR.");
    }
  }
  if (persona === "engineering" || persona === "post-sales") {
    const dec = nodes.find((n) => n.id === "node-decisioning");
    if (dec && (dec.healthScore ?? 0) >= 80) {
      ops.push("Decisioning models stable — opportunity to roll out auto-remediation playbooks.");
    }
  }
  if (analytics && (analytics.healthScore ?? 0) >= 90) {
    ops.push("Analytics layer is healthy — extend persona-aware dashboards to additional accounts.");
  }
  if (deployment && deployment.healthScore >= 80) {
    ops.push(`${deployment.name} is on-track — qualified candidate for case-study advocacy.`);
  }
  if (persona === "sales") {
    const partner = nodes.find((n) => n.id === "node-partner-hub");
    if (partner && (partner.healthScore ?? 0) >= 75) {
      ops.push("Partner Hub momentum — pull in co-sell motion for adjacent expansion.");
    }
  }
  if (persona === "support") {
    ops.push("Reduce inbound by promoting top 5 KB articles into in-product help.");
  }

  return ops.slice(0, 3);
}

function topPriorities(persona: Persona, deployment: Deployment | null, account: Account | null, goal: Goal): string[] {
  const lens = PERSONA_LENS[persona];
  const acct = account?.name ?? "the account";
  const dep = deployment?.name ?? "the active rollout";

  const base: Record<Goal, string[]> = {
    "Executive Review": [
      `Frame ${acct} progress against the original business case.`,
      `Triage any deployment blockers above the ${lens.audience}'s tolerance threshold.`,
      `Confirm next 30-day milestones with the customer sponsor.`,
    ],
    "Deal Strategy": [
      `Validate scope and commercial assumptions for ${acct}.`,
      `Confirm Pre-Sales → Implementation handoff is documented.`,
      `Identify the next champion conversation needed to advance the deal.`,
    ],
    "Rollout Checkpoint": [
      `Walk every milestone in ${dep} and surface slips.`,
      `Verify enablement track is staffed and on schedule.`,
      `Reconfirm go-live date with all blockers owners.`,
    ],
    "Renewal Risk Review": [
      `Score adoption against the original success plan.`,
      `Review support volume and CSAT trend for ${acct}.`,
      `Align on a 60-day save / expand plan with CSM and sponsor.`,
    ],
    "Support Escalation Review": [
      `Cluster active escalations by impacted system.`,
      `Identify any P1/P2 trending toward SLA breach.`,
      `Confirm engineering bridge is staffed for top root cause.`,
    ],
    "Technical Dependency Review": [
      `Map current degraded systems to downstream consumers.`,
      `Confirm rollback / mitigation plan for each at-risk dependency.`,
      `Schedule architecture review for the highest-criticality node.`,
    ],
  };

  return base[goal];
}

function walkthrough(persona: Persona, recommended: ArchitectureNode[], goal: Goal): string[] {
  const lens = PERSONA_LENS[persona];
  const steps = [
    `Open with a one-line framing of why this matters to the ${lens.audience}: ${lens.focus}.`,
  ];
  recommended.slice(0, 3).forEach((n, i) => {
    steps.push(
      `${i + 1}. Open ${n.name} — show its ${
        n.healthScore !== undefined ? `${n.healthScore}% health` : "current state"
      } and call out the ${lens.tone.split(",")[0]} signal.`,
    );
  });
  steps.push(`Close with the recommended next action tied to the ${goal.toLowerCase()}.`);
  return steps;
}

function nextActions(persona: Persona, deployment: Deployment | null, goal: Goal): string[] {
  const actions: string[] = [];
  if (deployment) {
    const openHigh = deployment.blockers?.find((b) => b.severity === "high" && b.status !== "resolved");
    if (openHigh) actions.push(`Drive resolution on: ${openHigh.description} (owner: ${openHigh.owner ?? "TBD"}).`);
    const nextMs = deployment.milestones?.find((m) => m.status !== "completed");
    if (nextMs) actions.push(`Confirm path to milestone "${nextMs.name}" by ${nextMs.dueDate ?? "next checkpoint"}.`);
  }
  if (persona === "vp") actions.push("Draft a 5-line summary for Monday exec sync.");
  if (persona === "sales") actions.push("Schedule the next champion call this week.");
  if (persona === "cs") actions.push("Update success plan & share with sponsor.");
  if (persona === "support") actions.push("Open a war-room channel for top escalation cluster.");
  if (persona === "engineering") actions.push("File mitigation tickets for each degraded dependency.");
  if (persona === "post-sales") actions.push("Lock the next milestone owner per workstream.");
  actions.push(`Re-run the ${goal} briefing in 7 days to track movement.`);
  return actions.slice(0, 5);
}

/**
 * Surface the user's freeform prompt as an extra line in the relevant section
 * so it visibly shapes the briefing today. When swapped for a real LLM, the
 * prompt should drive generation directly and this helper can be removed.
 */
function applyPromptOverlay(items: string[], prompt: string | undefined, kind: "priority" | "risk" | "opportunity"): string[] {
  const trimmed = prompt?.trim();
  if (!trimmed) return items;
  const lower = trimmed.toLowerCase();
  const targets = {
    priority: ["priorit", "focus", "summary", "summarize", "summarise", "demo", "agenda"],
    risk: ["risk", "blocker", "concern", "issue", "escalation", "outage", "degrad"],
    opportunity: ["opportunit", "expansion", "upsell", "renewal", "advoc", "case study", "expand"],
  } as const;
  const matches = targets[kind].some((kw) => lower.includes(kw));
  // If the prompt clearly aligns with a section, prepend a tailored line.
  // Otherwise, only seed the priorities section so the prompt is never silently dropped.
  if (matches || (kind === "priority" && items.length < 5)) {
    const label = kind === "priority" ? "User focus" : kind === "risk" ? "User-flagged risk" : "User-flagged opportunity";
    return [`${label}: ${trimmed}`, ...items].slice(0, 5);
  }
  return items;
}

function summarise(input: BriefingInput, recommended: ArchitectureNode[]): string {
  const lens = PERSONA_LENS[input.persona];
  const acct = input.account?.name ?? "the active account";
  const dep = input.deployment;
  const depPhrase = dep ? `${dep.name} is at ${dep.healthScore}% health` : "no active deployment is selected";
  const topNode = recommended[0];
  const topPhrase = topNode
    ? `Watch ${topNode.name}${topNode.healthScore !== undefined ? ` (${topNode.healthScore}%)` : ""} closely.`
    : "Architecture is stable across the persona-relevant slice.";
  return `For the ${lens.audience} on ${acct}: ${depPhrase}. Focus is ${lens.focus}. ${topPhrase}`;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a persona-aware briefing from existing mock data.
 *
 * STAGE 1: deterministic mock generator (current).
 * STAGE 2: swap this function body for a real LLM call — the input/output
 * shapes are the contract.
 */
export async function generateBriefing(input: BriefingInput): Promise<Briefing> {
  // Simulate a touch of latency so the UI feels live.
  await new Promise((r) => setTimeout(r, 350));

  const recommended = pickRelevantNodes(input.persona, input.nodes, 5);

  const recommendedResourceIds = Array.from(
    new Set(recommended.flatMap((n) => n.resourceIds ?? [])),
  ).slice(0, 4);

  return {
    persona: input.persona,
    accountId: input.account?.id ?? null,
    deploymentId: input.deployment?.id ?? null,
    goal: input.goal,
    generatedAt: new Date().toISOString(),
    summary: summarise(input, recommended),
    priorities: applyPromptOverlay(
      topPriorities(input.persona, input.deployment, input.account, input.goal),
      input.prompt,
      "priority",
    ),
    risks: applyPromptOverlay(
      topRisks(input.persona, input.nodes, input.deployment),
      input.prompt,
      "risk",
    ),
    opportunities: applyPromptOverlay(
      topOpportunities(input.persona, input.nodes, input.deployment),
      input.prompt,
      "opportunity",
    ),
    recommendedNodeIds: recommended.map((n) => n.id),
    recommendedResourceIds,
    walkthroughSteps: walkthrough(input.persona, recommended, input.goal),
    nextActions: nextActions(input.persona, input.deployment, input.goal),
  };
}

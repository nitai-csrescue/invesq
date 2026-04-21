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
import { isHiddenForCustomer } from "@/lib/persona-data";

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

export type Scope = "company" | "customer";

export interface BriefingInput {
  persona: Persona;
  /** Data slice. "company" = aggregate across all deployments; "customer" = single account/deployment. */
  scope: Scope;
  account: Account | null;
  deployment: Deployment | null;
  goal: Goal;
  prompt?: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  resources: Resource[];
  /** Required for company scope (aggregation source). Ignored for customer scope. */
  accounts?: Account[];
  deployments?: Deployment[];
}

/** Each line carries the evidence chips that produced it. */
export interface BriefingItem {
  text: string;
  sources: SignalSource[];
  /**
   * Carried through from a Signal so we can render an "(affects N deployments)"
   * suffix at the very end — after persona post-processing (customerizeText)
   * has already run and won't see the suffix.
   */
  affectedDeploymentCount?: number;
}

export interface Briefing {
  persona: Persona;
  scope: Scope;
  accountId: string | null;
  deploymentId: string | null;
  goal: Goal;
  generatedAt: string;
  /** Number of deployments aggregated (company scope). 1 for customer scope. */
  deploymentsCovered: number;
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
  customer: {
    audience: "customer (outside-in view)",
    focus: "what you experience: handoffs, delays, friction, and who supports you",
    tone: "plain, experience-oriented",
  },
};

/**
 * Customer-language post-processor.
 * Rewrites internal-system phrasing into outside-in experience phrasing.
 * Mappings (per spec):
 *   degraded edge   → delay
 *   blocker         → friction point
 *   dependency      → handoff
 *   retry / failure → repeated requests
 * Applied only when persona === "customer".
 */
function customerizeText(s: string): string {
  let t = s;
  // Degraded dependency: A → B (label).  →  Likely delay between A and B (label).
  t = t.replace(
    /Degraded dependency:\s*([^→]+?)\s*→\s*([^.]+?)\./,
    "Likely delay between $1 and $2.",
  );
  // Blocker (severity): desc — owner: o.
  t = t.replace(
    /Blocker\s*\(([^)]+)\):\s*(.+?)(?:\s*—\s*owner:\s*[^.]+)?\./,
    (_m, _sev, desc) => `Friction point in your experience: ${String(desc).trim()}.`,
  );
  // Health-score risk lines
  t = t.replace(
    /(.+?) is at (\d+)% — needs immediate attention.*\./,
    "$1 is responding slowly right now and is being worked on.",
  );
  t = t.replace(
    /(.+?) trending toward degraded at (\d+)%.*\./,
    "$1 is showing early signs of slowness.",
  );
  // Deployment health bands
  t = t.replace(
    /(.+?) is at (\d+)% health — well below safe.*\./,
    "Your rollout ($1) is running into difficulty right now.",
  );
  t = t.replace(
    /(.+?) health is (\d+)% — trending toward warning\./,
    "Your rollout ($1) feels a little bumpy this week.",
  );
  t = t.replace(
    /(.+?) is healthy at (\d+)% — qualified for case-study advocacy\./,
    "Your rollout ($1) is on track — a strong story to share.",
  );
  // Resource lines
  t = t.replace(
    /(.+?) is degraded — affects your focus area systems\./,
    "$1 is intermittently slow — you may notice repeated requests.",
  );
  t = t.replace(
    /(.+?) is operational and tied to your focus area — viable foundation for the next play\./,
    "$1 is reliable today and supports your day-to-day.",
  );
  // Account lifecycle / status lines
  t = t.replace(
    /(.+?) is in active CSM\/renewal motion — align success plan and confirm sponsor\./,
    "Your account team is in steady contact and reviewing renewal with you.",
  );
  t = t.replace(
    /(.+?) is in implementation — protect time-to-value and milestone cadence\./,
    "Your rollout is in progress — expect frequent updates and milestones.",
  );
  t = t.replace(
    /(.+?) is pre-go-live \(([^)]+)\) — protect scope and de-risk handoff\./,
    "You're getting set up ($2) — expect scoping and contracting conversations.",
  );
  t = t.replace(
    /(.+?) is in steady-state support — watch escalation patterns for renewal signals\./,
    "You're in day-to-day support mode; reach out anytime.",
  );
  t = t.replace(
    /(.+?) is flagged as at-risk — drive a 60-day save plan\./,
    "Your account team is actively re-engaging to support you over the next 60 days.",
  );
  t = t.replace(
    /(.+?) is active in CSM — qualified for expansion conversation; pull Partner Hub in\./,
    "Your team and ours are well-aligned — new use cases are on the table.",
  );
  t = t.replace(
    /(.+?) is a prospect — anchor the demo on outcomes, not features\./,
    "You're evaluating fit — focus is on outcomes, not features.",
  );
  t = t.replace(
    /(.+?) is churned.*\./,
    "$1 is no longer an active customer.",
  );
  // Milestone & systems-walking phrasing
  t = t.replace(
    /Confirm path to "([^"]+)"(\s*by\s*[^.]+)?\./,
    'Next visible step: "$1"$2.',
  );
  t = t.replace(
    /Walk the systems backing (.+?):\s*(.+?)\./,
    "Behind the scenes, these teams support your rollout ($1): $2.",
  );
  // Generic vocabulary swaps (last-pass, safe)
  t = t.replace(/\bdependency\b/gi, "handoff");
  t = t.replace(/\bdependencies\b/gi, "handoffs");
  t = t.replace(/\bdegraded\b/gi, "delayed");
  t = t.replace(/\b(?:retry|retries|failures?)\b/gi, "repeated requests");
  return t;
}

function customerizeItems(items: BriefingItem[]): BriefingItem[] {
  return items.map((it) => ({ ...it, text: customerizeText(it.text) }));
}

function toItem(s: Signal): BriefingItem {
  return {
    text: s.text,
    sources: s.sources,
    affectedDeploymentCount: s.affectedDeploymentCount,
  };
}

/**
 * Final-pass suffix. Runs AFTER customerizeText so the regex anchors in
 * customerizeText still match unmodified text.
 *  - non-customer persona: " (affects N deployments)"
 *  - customer persona:     " — also affecting N other rollouts"
 */
function withAffectedSuffix(items: BriefingItem[], persona: Persona): BriefingItem[] {
  return items.map((it) => {
    const n = it.affectedDeploymentCount;
    if (!n || n < 2) return it;
    const suffix =
      persona === "customer"
        ? ` — also affecting ${n - 1} other rollout${n - 1 === 1 ? "" : "s"}.`
        : ` (affects ${n} deployments)`;
    // Avoid double-suffixing if a builder already inlined it
    if (it.text.includes("affects ") || it.text.includes("also affecting")) return it;
    // For customer suffix replace trailing period, otherwise append
    const trimmed = it.text.replace(/\s+$/, "");
    if (persona === "customer") {
      return { ...it, text: trimmed.replace(/\.$/, "") + suffix };
    }
    return { ...it, text: trimmed + suffix };
  });
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
    if (persona === "customer") {
      // Cluster-based filter: drop platform/data plumbing for the outside-in lens.
      return !isHiddenForCustomer(n.clusterGroup);
    }
    if (!n.visibleToPersonas?.length) return true;
    return (n.visibleToPersonas as readonly string[]).includes(persona);
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
    customer: "Send a recap to your sponsor and confirm the next visible touchpoint.",
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
 * Aggregate signals across every deployment for company scope.
 * - Runs scoreSignals once per deployment (with its parent account)
 * - Plus a baseline pass with no deployment so global node/edge/resource
 *   signals are captured even when no deployments exist
 * - Dedupes by signal text, keeps highest weight, accumulates affected
 *   deployment names, and suffixes "(affects N deployments)" when N > 1
 */
function aggregateCompanySignals(input: BriefingInput): {
  signals: Signal[];
  deploymentsCovered: number;
} {
  const persona = input.persona;
  const accounts = input.accounts ?? [];
  const deployments = input.deployments ?? [];
  const acctById = new Map(accounts.map((a) => [a.id, a]));

  // Baseline pass — global node/edge/resource health that isn't deployment-tied
  const baseline = scoreSignals({
    persona,
    account: null,
    deployment: null,
    nodes: input.nodes,
    edges: input.edges,
    resources: input.resources,
  });

  type Bucket = Signal & { affected: Set<string>; depNames: string[] };
  const merged = new Map<string, Bucket>();

  function add(s: Signal, dep?: Deployment) {
    const key = s.text;
    const existing = merged.get(key);
    if (existing) {
      if (dep) {
        existing.affected.add(dep.id);
        if (!existing.depNames.includes(dep.name)) existing.depNames.push(dep.name);
      }
      if (s.weight > existing.weight) existing.weight = s.weight;
      // Union sources (cap at 6 for output sanity)
      for (const src of s.sources) {
        if (existing.sources.length >= 6) break;
        const dup = existing.sources.some((x) => x.kind === src.kind && x.id === src.id);
        if (!dup) existing.sources.push(src);
      }
    } else {
      merged.set(key, {
        ...s,
        sources: [...s.sources],
        affected: new Set(dep ? [dep.id] : []),
        depNames: dep ? [dep.name] : [],
      });
    }
  }

  baseline.forEach((s) => add(s));
  for (const dep of deployments) {
    const acct = dep.accountId ? acctById.get(dep.accountId) ?? null : null;
    const perDep = scoreSignals({
      persona,
      account: acct,
      deployment: dep,
      nodes: input.nodes,
      edges: input.edges,
      resources: input.resources,
    });
    perDep.forEach((s) => add(s, dep));
  }

  // IMPORTANT: do NOT append the "(affects N deployments)" suffix to text here.
  // We carry the count on the signal and append the suffix AFTER any persona
  // post-processing (e.g. customerizeText) has run, so its regexes still match.
  const aggregated: Signal[] = [...merged.values()]
    .map<Signal>((b) => {
      const count = b.affected.size;
      const popularityBoost = count > 1 ? Math.min(count - 1, 3) : 0;
      return {
        kind: b.kind,
        text: b.text,
        weight: b.weight + popularityBoost,
        sources: b.sources,
        personas: b.personas,
        nodeIds: b.nodeIds,
        edgeIds: b.edgeIds,
        resourceIds: b.resourceIds,
        affectedDeploymentCount: count > 1 ? count : undefined,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  return { signals: aggregated, deploymentsCovered: deployments.length };
}

function buildCompanyPriorities(
  signals: Signal[],
  goal: Goal,
  deploymentsCovered: number,
): BriefingItem[] {
  const goalSeed: Record<Goal, string> = {
    "Executive Review": `Roll up portfolio health across ${deploymentsCovered} active deployments.`,
    "Deal Strategy": `Surface the deals most exposed to delivery or scope risk.`,
    "Rollout Checkpoint": `Identify the rollouts trending below safe thresholds this week.`,
    "Renewal Risk Review": `Flag accounts whose adoption signals threaten renewal.`,
    "Support Escalation Review": `Cluster top escalations by impacted system across the book.`,
    "Technical Dependency Review": `List degraded dependencies with the widest blast radius.`,
  };
  const seed: BriefingItem = { text: goalSeed[goal], sources: [] };
  const fromSignals = topByKind(signals, "priority", 3).map(toItem);
  return [seed, ...fromSignals].slice(0, 4);
}

function buildCompanyNextActions(persona: Persona, goal: Goal, deploymentsCovered: number): BriefingItem[] {
  const personaActions: Record<Persona, string> = {
    vp: "Draft a portfolio summary for Monday exec sync.",
    sales: "Identify the top 3 deals at delivery risk and brief the AEs.",
    cs: "Triage the at-risk accounts and schedule save-plan reviews.",
    support: "Open a war-room for the largest cross-deployment escalation cluster.",
    engineering: "Prioritize fixes for the dependency with the widest blast radius.",
    "post-sales": "Re-sequence implementations behind the most-affected milestones.",
    customer: "Pick the rollout you care about and switch to Customer scope to see specifics.",
  };
  return [
    { text: `Drill into the top-affected deployment to see specifics (Customer scope).`, sources: [] },
    { text: personaActions[persona], sources: [] },
    { text: `Re-run this ${goal} portfolio brief in 7 days to track movement across all ${deploymentsCovered} rollouts.`, sources: [] },
  ];
}

function summariseCompany(
  persona: Persona,
  signals: Signal[],
  recommended: ArchitectureNode[],
  deploymentsCovered: number,
): string {
  const lens = PERSONA_LENS[persona];
  const topRisk = signals.find((s) => s.kind === "risk");
  const topNode = recommended[0];
  const tail = topRisk
    ? `Top portfolio risk: ${topRisk.text}`
    : topNode
      ? `Watch ${topNode.name}${topNode.healthScore !== undefined ? ` (${topNode.healthScore}%)` : ""} closely.`
      : "Portfolio is stable across the persona-relevant slice.";
  return `Company-wide view for the ${lens.audience}: ${deploymentsCovered} active deployments scanned. Focus is ${lens.focus}. ${tail}`;
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

  const isCompany = input.scope === "company";
  const isCustomer = input.persona === "customer";
  const xform = (items: BriefingItem[]) => (isCustomer ? customerizeItems(items) : items);

  // ── Signal pool ────────────────────────────────────────────────────────
  let signals: Signal[];
  let deploymentsCovered: number;
  if (isCompany) {
    const agg = aggregateCompanySignals(input);
    signals = agg.signals;
    deploymentsCovered = agg.deploymentsCovered;
  } else {
    signals = scoreSignals({
      persona: input.persona,
      account: input.account,
      deployment: input.deployment,
      nodes: input.nodes,
      edges: input.edges,
      resources: input.resources,
    });
    deploymentsCovered = input.deployment ? 1 : 0;
  }

  const recommended = pickRecommendedNodes(signals, input.persona, input.nodes, 5);

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

  // ── Section builders branch on scope ──────────────────────────────────
  const summary = isCompany
    ? summariseCompany(input.persona, signals, recommended, deploymentsCovered)
    : summarise(input, recommended, signals);

  const priorities = isCompany
    ? buildCompanyPriorities(signals, input.goal, deploymentsCovered)
    : buildPriorities(signals, input.goal, input.account, input.deployment);

  const walkthrough = isCompany
    ? [
        { text: `Open with a portfolio framing for the ${PERSONA_LENS[input.persona].audience}: ${PERSONA_LENS[input.persona].focus}.`, sources: [] },
        ...recommended.slice(0, 3).map<BriefingItem>((n, i) => ({
          text: `${i + 1}. Open ${n.name}${n.ownerTeam ? ` (owned by ${n.ownerTeam})` : ""} — show why it's the highest-leverage focus across the book.`,
          sources: [{ kind: "node", id: n.id, label: n.name }],
        })),
        { text: `Close by drilling into the most-affected deployment for specifics.`, sources: [] },
      ]
    : buildWalkthrough(input.persona, recommended, input.goal);

  const nextActions = isCompany
    ? buildCompanyNextActions(input.persona, input.goal, deploymentsCovered)
    : buildNextActions(input.persona, input.deployment, input.goal);

  return {
    persona: input.persona,
    scope: input.scope,
    accountId: isCompany ? null : input.account?.id ?? null,
    deploymentId: isCompany ? null : input.deployment?.id ?? null,
    goal: input.goal,
    generatedAt: new Date().toISOString(),
    deploymentsCovered,
    summary: isCustomer ? customerizeText(summary) : summary,
    // Pipeline order matters: build → prompt overlay → persona rewrite (xform)
    // → "(affects N deployments)" suffix LAST so customerizeText regexes match.
    priorities: withAffectedSuffix(
      xform(applyPromptOverlay(priorities, input.prompt, "priority")),
      input.persona,
    ),
    risks: withAffectedSuffix(
      xform(applyPromptOverlay(topByKind(signals, "risk", 3).map(toItem), input.prompt, "risk")),
      input.persona,
    ),
    opportunities: withAffectedSuffix(
      xform(applyPromptOverlay(topByKind(signals, "opportunity", 3).map(toItem), input.prompt, "opportunity")),
      input.persona,
    ),
    recommendedNodeIds: recommended.map((n) => n.id),
    recommendedEdgeIds,
    recommendedResourceIds,
    walkthroughSteps: xform(walkthrough),
    nextActions: xform(nextActions),
    signalStats: stats,
  };
}

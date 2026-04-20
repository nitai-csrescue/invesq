import type {
  Account,
  ArchitectureEdge,
  ArchitectureNode,
  Deployment,
  Resource,
} from "@workspace/api-client-react";
import type { Persona } from "@/lib/persona";

/** A traceable evidence chip attached to every Copilot recommendation. */
export type SignalSource =
  | { kind: "deployment"; id: string; label: string }
  | { kind: "blocker"; id: string; label: string }
  | { kind: "milestone"; id: string; label: string }
  | { kind: "edge"; id: string; label: string }
  | { kind: "node"; id: string; label: string }
  | { kind: "resource"; id: string; label: string }
  | { kind: "account"; id: string; label: string };

export type SignalKind = "risk" | "priority" | "opportunity";

export interface Signal {
  kind: SignalKind;
  text: string;
  /** Higher = more important. */
  weight: number;
  sources: SignalSource[];
  /** Optional persona affinity boost (matched personas get +1). */
  personas?: Persona[];
  /** Architecture nodes implicated by this signal. */
  nodeIds?: string[];
  /** Architecture edges implicated by this signal. */
  edgeIds?: string[];
  /** Resources implicated by this signal. */
  resourceIds?: string[];
}

interface ScoreContext {
  persona: Persona;
  account: Account | null;
  deployment: Deployment | null;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  resources: Resource[];
}

const PERSONA_NODE_BIAS: Record<Persona, string[]> = {
  vp: ["node-implementation", "node-csm", "node-deployment-intelligence", "node-analytics"],
  sales: ["node-pre-sales", "node-contract", "node-implementation", "node-crm", "node-partner-hub"],
  "post-sales": [
    "node-implementation",
    "node-forward-deployed",
    "node-lifecycle-playbooks",
    "node-deployment-intelligence",
  ],
  cs: ["node-csm", "node-analytics", "node-lifecycle-playbooks", "node-crm", "node-support"],
  support: ["node-support", "node-case-management", "node-document", "node-api-gateway"],
  engineering: [
    "node-api-gateway",
    "node-data-orchestration",
    "node-decisioning",
    "node-deployment-intelligence",
    "node-compliance",
  ],
};

export function getPersonaNodeBias(persona: Persona): string[] {
  return PERSONA_NODE_BIAS[persona];
}

/**
 * Scan the live data graph for risk / priority / opportunity signals and return
 * them sorted by weight. Persona affinity gives a small boost so the same data
 * surfaces different angles for different audiences.
 */
export function scoreSignals(ctx: ScoreContext): Signal[] {
  const { persona, account, deployment, nodes, edges, resources } = ctx;
  const out: Signal[] = [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // ── Deployment-driven signals ───────────────────────────────────────────
  if (deployment) {
    const depSrc: SignalSource = { kind: "deployment", id: deployment.id, label: deployment.name };

    if (deployment.healthScore < 70) {
      out.push({
        kind: "risk",
        text: `${deployment.name} is at ${deployment.healthScore}% health — well below safe (75%).`,
        weight: 5,
        sources: [depSrc],
        personas: ["vp", "post-sales", "cs"],
      });
    } else if (deployment.healthScore < 85) {
      out.push({
        kind: "risk",
        text: `${deployment.name} health is ${deployment.healthScore}% — trending toward warning.`,
        weight: 3,
        sources: [depSrc],
      });
    } else {
      out.push({
        kind: "opportunity",
        text: `${deployment.name} is healthy at ${deployment.healthScore}% — qualified for case-study advocacy.`,
        weight: 2,
        sources: [depSrc],
        personas: ["vp", "sales", "cs"],
      });
    }

    // Blockers
    for (const b of deployment.blockers ?? []) {
      if (b.status === "resolved") continue;
      const weight =
        b.severity === "critical" ? 5 :
        b.severity === "high" ? 4 :
        b.severity === "medium" ? 3 : 2;
      out.push({
        kind: "risk",
        text: `Blocker (${b.severity}): ${b.description}${b.owner ? ` — owner: ${b.owner}` : ""}`,
        weight,
        sources: [depSrc, { kind: "blocker", id: b.id, label: b.description }],
        personas: ["post-sales", "vp", "engineering"],
      });
    }

    // Next milestone — drives priorities
    const nextMs = deployment.milestones?.find((m) => m.status !== "completed");
    if (nextMs) {
      out.push({
        kind: "priority",
        text: `Confirm path to "${nextMs.name}"${nextMs.dueDate ? ` by ${nextMs.dueDate}` : ""}.`,
        weight: 3,
        sources: [depSrc, { kind: "milestone", id: nextMs.id, label: nextMs.name }],
        personas: ["post-sales", "vp"],
      });
    }

    // Architecture nodes wired to this deployment carry deployment context
    if (deployment.architectureNodeIds?.length) {
      const depNodeIds = deployment.architectureNodeIds.filter((id) => nodeById.has(id));
      if (depNodeIds.length > 0) {
        out.push({
          kind: "priority",
          text: `Walk the systems backing ${deployment.name}: ${depNodeIds
            .map((id) => nodeById.get(id)?.name ?? id)
            .slice(0, 3)
            .join(", ")}.`,
          weight: 2,
          sources: [depSrc, ...depNodeIds.slice(0, 3).map<SignalSource>((id) => ({
            kind: "node",
            id,
            label: nodeById.get(id)?.name ?? id,
          }))],
          nodeIds: depNodeIds,
        });
      }
    }
  }

  // ── Node-health signals ─────────────────────────────────────────────────
  for (const n of nodes) {
    const score = n.healthScore ?? 100;
    if (n.visibleToPersonas?.length && !n.visibleToPersonas.includes(persona)) continue;

    if (score < 70) {
      out.push({
        kind: "risk",
        text: `${n.name} is at ${score}% — needs immediate attention (owner: ${n.ownerTeam}).`,
        weight: 4,
        sources: [{ kind: "node", id: n.id, label: n.name }],
        nodeIds: [n.id],
        personas: ["engineering", "vp", "support"],
      });
    } else if (score < 80) {
      out.push({
        kind: "risk",
        text: `${n.name} trending toward degraded at ${score}% (owner: ${n.ownerTeam}).`,
        weight: 2,
        sources: [{ kind: "node", id: n.id, label: n.name }],
        nodeIds: [n.id],
      });
    } else if (score >= 95 && PERSONA_NODE_BIAS[persona].includes(n.id)) {
      out.push({
        kind: "opportunity",
        text: `${n.name} is performing strongly (${score}%) — lean into it for the ${persona} story.`,
        weight: 2,
        sources: [{ kind: "node", id: n.id, label: n.name }],
        nodeIds: [n.id],
        personas: [persona],
      });
    }
  }

  // ── Degraded edges ──────────────────────────────────────────────────────
  for (const e of edges) {
    if (e.status !== "degraded") continue;
    const src = nodeById.get(e.source);
    const tgt = nodeById.get(e.target);
    const label = `${src?.name ?? e.source} → ${tgt?.name ?? e.target}${e.label ? ` (${e.label})` : ""}`;
    out.push({
      kind: "risk",
      text: `Degraded dependency: ${label}.`,
      weight: 3,
      sources: [
        { kind: "edge", id: e.id, label },
        ...(src ? [{ kind: "node" as const, id: src.id, label: src.name }] : []),
        ...(tgt ? [{ kind: "node" as const, id: tgt.id, label: tgt.name }] : []),
      ],
      nodeIds: [e.source, e.target],
      edgeIds: [e.id],
      personas: ["engineering", "post-sales"],
    });
  }

  // ── Account-driven priorities ───────────────────────────────────────────
  if (account) {
    const acctSrc: SignalSource = { kind: "account", id: account.id, label: account.name };
    // Lifecycle stage values: pre_sales | contracting | implementation | csm | support | churned
    if (account.lifecycleStage === "csm") {
      out.push({
        kind: "priority",
        text: `${account.name} is in active CSM/renewal motion — align success plan and confirm sponsor.`,
        weight: 3,
        sources: [acctSrc],
        personas: ["cs", "sales", "vp"],
      });
    } else if (account.lifecycleStage === "implementation") {
      out.push({
        kind: "priority",
        text: `${account.name} is in implementation — protect time-to-value and milestone cadence.`,
        weight: 3,
        sources: [acctSrc],
        personas: ["post-sales", "cs"],
      });
    } else if (account.lifecycleStage === "pre_sales" || account.lifecycleStage === "contracting") {
      out.push({
        kind: "priority",
        text: `${account.name} is pre-go-live (${account.lifecycleStage.replace("_", "-")}) — protect scope and de-risk handoff.`,
        weight: 3,
        sources: [acctSrc],
        personas: ["sales", "vp"],
      });
    } else if (account.lifecycleStage === "support") {
      out.push({
        kind: "priority",
        text: `${account.name} is in steady-state support — watch escalation patterns for renewal signals.`,
        weight: 2,
        sources: [acctSrc],
        personas: ["support", "cs"],
      });
    }

    // Account status: active | at_risk | churned | prospect
    if (account.status === "at_risk") {
      out.push({
        kind: "risk",
        text: `${account.name} is flagged as at-risk — drive a 60-day save plan.`,
        weight: 4,
        sources: [acctSrc],
        personas: ["cs", "vp", "sales"],
      });
    } else if (account.status === "active" && account.lifecycleStage === "csm") {
      // Active + CSM = healthy adoption — surface as expansion opportunity
      out.push({
        kind: "opportunity",
        text: `${account.name} is active in CSM — qualified for expansion conversation; pull Partner Hub in.`,
        weight: 3,
        sources: [acctSrc],
        personas: ["sales", "cs"],
      });
    } else if (account.status === "prospect") {
      out.push({
        kind: "opportunity",
        text: `${account.name} is a prospect — anchor the demo on outcomes, not features.`,
        weight: 2,
        sources: [acctSrc],
        personas: ["sales"],
      });
    } else if (account.status === "churned") {
      out.push({
        kind: "risk",
        text: `${account.name} is churned — use only as a learning artifact, not a forward play.`,
        weight: 3,
        sources: [acctSrc],
        personas: ["vp", "cs"],
      });
    }
  }

  // ── Resource opportunities (stable systems linked to persona-relevant nodes) ──
  const biasNodeIds = new Set(PERSONA_NODE_BIAS[persona]);
  for (const r of resources) {
    // Resource status enum: connected | disconnected | degraded | pending
    // Treat degraded as a risk; treat connected as opportunity foundation.
    if (r.status === "degraded" && r.linkedNodeIds.some((id) => biasNodeIds.has(id))) {
      out.push({
        kind: "risk",
        text: `${r.name} is degraded — affects your focus area systems.`,
        weight: 3,
        sources: [{ kind: "resource", id: r.id, label: r.name }],
        resourceIds: [r.id],
        personas: [persona, "engineering"],
      });
      continue;
    }
    if (r.status !== "connected") continue;
    if (!r.linkedNodeIds.some((id) => biasNodeIds.has(id))) continue;
    out.push({
      kind: "opportunity",
      text: `${r.name} is operational and tied to your focus area — viable foundation for the next play.`,
      weight: 1,
      sources: [{ kind: "resource", id: r.id, label: r.name }],
      resourceIds: [r.id],
      personas: [persona],
    });
  }

  // Persona affinity boost: signals that explicitly target this persona float up.
  for (const s of out) {
    if (s.personas?.includes(persona)) s.weight += 1;
  }

  // Sort by descending weight (stable for equal weights).
  out.sort((a, b) => b.weight - a.weight);
  return out;
}

export function topByKind(signals: Signal[], kind: SignalKind, limit = 4): Signal[] {
  return signals.filter((s) => s.kind === kind).slice(0, limit);
}

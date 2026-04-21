export type Persona = "vp" | "sales" | "post-sales" | "cs" | "support" | "engineering" | "customer";
export type ViewMode = "business" | "dependency" | "systems";
export type Priority = "primary" | "secondary" | "hidden";

export const PERSONAS: { id: Persona; label: string; tagline: string }[] = [
  { id: "vp", label: "VP", tagline: "High-level lifecycle health" },
  { id: "sales", label: "Sales", tagline: "Pipeline → contract → handoff" },
  { id: "post-sales", label: "Post-Sales", tagline: "Implementation & launch" },
  { id: "cs", label: "Customer Success", tagline: "Adoption & expansion" },
  { id: "support", label: "Support", tagline: "Cases & knowledge" },
  { id: "engineering", label: "Engineering", tagline: "Full system topology" },
  { id: "customer", label: "Customer", tagline: "Outside-in: experience, not systems" },
];

/**
 * Customer persona is an "outside-in" lens: emphasize lifecycle teams the
 * customer actually feels (implementation, csm, support, delivery, retention,
 * customer-data) and hide internal platform/data plumbing.
 */
const CUSTOMER_HIDDEN_CLUSTERS = new Set(["data-platform", "platform-services"]);
const CUSTOMER_PRIMARY_CLUSTERS = new Set(["delivery", "retention"]);

/** Shared rule for AI scoring + recommendation paths to honor the customer lens. */
export function isHiddenForCustomer(clusterGroup: string | undefined | null): boolean {
  return clusterGroup ? CUSTOMER_HIDDEN_CLUSTERS.has(clusterGroup) : false;
}

export const VIEW_MODES: { id: ViewMode; label: string; description: string }[] = [
  { id: "business", label: "Business View", description: "Grouped lanes & clusters" },
  { id: "dependency", label: "Dependency View", description: "Edges & relationships" },
  { id: "systems", label: "Systems View", description: "Full technical topology" },
];

interface NodeWithMeta {
  id: string;
  visibleToPersonas?: string[];
  defaultPriorityByPersona?: Record<string, string>;
  clusterGroup?: string;
}

export function getNodePriority(node: NodeWithMeta, persona: Persona): Priority {
  // Customer is an outside-in lens: hide platform/data plumbing, promote
  // lifecycle/delivery/retention teams. If a node has no clusterGroup,
  // default to secondary (do NOT fall through to the legacy persona allowlist,
  // which cannot include "customer" and would accidentally hide everything).
  if (persona === "customer") {
    if (!node.clusterGroup) return "secondary";
    if (CUSTOMER_HIDDEN_CLUSTERS.has(node.clusterGroup)) return "hidden";
    if (CUSTOMER_PRIMARY_CLUSTERS.has(node.clusterGroup)) return "primary";
    return "secondary";
  }
  if (node.visibleToPersonas && node.visibleToPersonas.length > 0) {
    if (!node.visibleToPersonas.includes(persona)) return "hidden";
  }
  const p = node.defaultPriorityByPersona?.[persona];
  if (p === "primary" || p === "secondary" || p === "hidden") return p;
  return "secondary";
}

export const CLUSTER_LABELS: Record<string, { label: string; color: string; description: string }> = {
  revenue: { label: "Revenue Motion", color: "#6366f1", description: "Pre-sales through contract & partnerships" },
  delivery: { label: "Delivery & Onboarding", color: "#3b82f6", description: "Implementation, playbooks, deployment" },
  retention: { label: "Retention & Growth", color: "#10b981", description: "CSM, support, expansion" },
  "customer-data": { label: "Customer Data", color: "#06b6d4", description: "CRM, cases, knowledge" },
  "data-platform": { label: "Data & Intelligence", color: "#8b5cf6", description: "Orchestration, decisioning, BI" },
  "platform-services": { label: "Platform Services", color: "#f59e0b", description: "API gateway, compliance, security" },
};

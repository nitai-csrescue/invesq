export type Persona = "vp" | "sales" | "post-sales" | "cs" | "support" | "engineering";
export type ViewMode = "business" | "dependency" | "systems";
export type Priority = "primary" | "secondary" | "hidden";

export const PERSONAS: { id: Persona; label: string; tagline: string }[] = [
  { id: "vp", label: "VP", tagline: "High-level lifecycle health" },
  { id: "sales", label: "Sales", tagline: "Pipeline → contract → handoff" },
  { id: "post-sales", label: "Post-Sales", tagline: "Implementation & launch" },
  { id: "cs", label: "Customer Success", tagline: "Adoption & expansion" },
  { id: "support", label: "Support", tagline: "Cases & knowledge" },
  { id: "engineering", label: "Engineering", tagline: "Full system topology" },
];

export const VIEW_MODES: { id: ViewMode; label: string; description: string }[] = [
  { id: "business", label: "Business View", description: "Grouped lanes & clusters" },
  { id: "dependency", label: "Dependency View", description: "Edges & relationships" },
  { id: "systems", label: "Systems View", description: "Full technical topology" },
];

interface NodeWithMeta {
  id: string;
  visibleToPersonas?: string[];
  defaultPriorityByPersona?: Record<string, string>;
}

export function getNodePriority(node: NodeWithMeta, persona: Persona): Priority {
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

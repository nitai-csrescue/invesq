import { createContext, useContext, useState, useMemo, type ReactNode } from "react";

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

interface PersonaContextValue {
  persona: Persona;
  setPersona: (p: Persona) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  simplify: boolean;
  setSimplify: (b: boolean) => void;
  clusterByRelevance: boolean;
  setClusterByRelevance: (b: boolean) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<Persona>("vp");
  const [viewMode, setViewMode] = useState<ViewMode>("business");
  const [simplify, setSimplify] = useState(false);
  // When true, BusinessView re-orders cards within each cluster so primary nodes
  // for the active persona float to the top and secondary nodes sink/dim.
  const [clusterByRelevance, setClusterByRelevance] = useState(true);

  const value = useMemo(
    () => ({ persona, setPersona, viewMode, setViewMode, simplify, setSimplify, clusterByRelevance, setClusterByRelevance }),
    [persona, viewMode, simplify, clusterByRelevance],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be used within a PersonaProvider");
  return ctx;
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface NodeWithMeta {
  id: string;
  visibleToPersonas?: string[];
  defaultPriorityByPersona?: Record<string, string>;
}

export function getNodePriority(node: NodeWithMeta, persona: Persona): Priority {
  // Hidden if not in visibleToPersonas
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

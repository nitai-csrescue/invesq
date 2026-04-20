import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import type { Persona, ViewMode } from "./persona-data";

export { PERSONAS, VIEW_MODES, CLUSTER_LABELS, getNodePriority } from "./persona-data";
export type { Persona, ViewMode, Priority } from "./persona-data";

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

import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from "react";
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
  /** The account id the Customer persona is pinned to (outside-in view). */
  customerAccountId: string;
  setCustomerAccountId: (id: string) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

const PERSONA_STORAGE_KEY = "cs-rescue:persona";
const CUSTOMER_ACCOUNT_STORAGE_KEY = "cs-rescue:customer-account";
const DEFAULT_CUSTOMER_ACCOUNT_ID = "a_stark";
const VALID_PERSONAS: Persona[] = ["vp", "sales", "post-sales", "cs", "support", "engineering", "customer"];

function readStoredPersona(): Persona {
  if (typeof window === "undefined") return "vp";
  try {
    const raw = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    if (raw && (VALID_PERSONAS as string[]).includes(raw)) return raw as Persona;
  } catch {
    // localStorage unavailable (e.g. SSR / privacy mode) — fall through.
  }
  return "vp";
}

function readStoredCustomerAccount(): string {
  if (typeof window === "undefined") return DEFAULT_CUSTOMER_ACCOUNT_ID;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_ACCOUNT_STORAGE_KEY);
    if (raw) return raw;
  } catch {
    // localStorage unavailable — fall through.
  }
  return DEFAULT_CUSTOMER_ACCOUNT_ID;
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona>(readStoredPersona);
  const [viewMode, setViewMode] = useState<ViewMode>("business");
  const [simplify, setSimplify] = useState(true);
  const [clusterByRelevance, setClusterByRelevance] = useState(true);
  const [customerAccountId, setCustomerAccountIdState] = useState<string>(readStoredCustomerAccount);

  const setPersona = (p: Persona) => {
    setPersonaState(p);
    try {
      window.localStorage.setItem(PERSONA_STORAGE_KEY, p);
    } catch {
      // ignore storage failures
    }
  };

  const setCustomerAccountId = (id: string) => {
    setCustomerAccountIdState(id);
    try {
      window.localStorage.setItem(CUSTOMER_ACCOUNT_STORAGE_KEY, id);
    } catch {
      // ignore storage failures
    }
  };

  // Sync across tabs / windows.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.newValue) return;
      if (e.key === PERSONA_STORAGE_KEY && (VALID_PERSONAS as string[]).includes(e.newValue)) {
        setPersonaState(e.newValue as Persona);
      } else if (e.key === CUSTOMER_ACCOUNT_STORAGE_KEY) {
        setCustomerAccountIdState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({
      persona, setPersona,
      viewMode, setViewMode,
      simplify, setSimplify,
      clusterByRelevance, setClusterByRelevance,
      customerAccountId, setCustomerAccountId,
    }),
    [persona, viewMode, simplify, clusterByRelevance, customerAccountId],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be used within a PersonaProvider");
  return ctx;
}

/**
 * The "current user" stand-in for personas that should feel personalized
 * (e.g. a CSM seeing *their own* book first).
 */
export const PERSONA_CURRENT_USER: Partial<Record<Persona, string>> = {
  cs: "u_priya",          // Senior CSM — owns Stark, etc.
  "post-sales": "u_jordan", // Onboarding Lead
  sales: "u_sam",          // Renewals/expansion lead — closest AE proxy in demo data
  support: "u_alex",
};

import type { ArchInsightKind } from "@/data/architectureInsights";

/**
 * Lightweight "documentation layer" — recent learnings about the system.
 * Seeded with curated items, with the option to append at runtime when the
 * user runs an AI search. Persisted to localStorage so demo state survives
 * page reloads. This is NOT a chat history — each finding is one short
 * declarative observation, not a conversation.
 */
export interface Finding {
  id: string;
  /** ms since epoch — used to render relative timestamps like "2h ago". */
  ts: number;
  kind: ArchInsightKind;
  text: string;
  /** Optional small chips, e.g. ["Support", "CSM"] or ["node-csm", "Wayne"]. */
  sources?: string[];
  /** Architecture node ids to highlight when the finding is clicked. */
  nodeIds?: string[];
}

const STORAGE_KEY = "cs-rescue:findings";
const MAX_FINDINGS = 12;

const HOUR = 60 * 60 * 1000;
const now = Date.now();

/** Curated baseline so Findings always has content on first load. */
const SEED: Finding[] = [
  {
    id: "f-seed-support-spike",
    ts: now - 2 * HOUR,
    kind: "pain",
    text: "Noticed Support case volume spiked 23% over the last 14 days, mostly from Wayne and two other top accounts.",
    sources: ["Support", "Zendesk"],
    nodeIds: ["node-support", "node-case-management"],
  },
  {
    id: "f-seed-ttv-pattern",
    ts: now - 5 * HOUR,
    kind: "pain",
    text: "Seeing a pattern: every TTV miss this quarter traces back to the Implementation → CSM handoff being more than 7 days late.",
    sources: ["Implementation", "CSM"],
    nodeIds: ["node-implementation", "node-csm"],
  },
  {
    id: "f-seed-stark-expansion",
    ts: now - 9 * HOUR,
    kind: "opportunity",
    text: "Flagging this: Stark Industries seat utilization hit 91% — third week in a row above 85%. Expansion-ready.",
    sources: ["Product Usage", "CSM"],
    nodeIds: ["node-csm", "node-pre-sales"],
  },
  {
    id: "f-seed-decisioning-drift",
    ts: now - 18 * HOUR,
    kind: "action",
    text: "Decisioning model accuracy slipped 3 pts after the last data refresh. Likely Data Orchestration freshness, not the model itself.",
    sources: ["Decisioning", "Data Orchestration"],
    nodeIds: ["node-decisioning", "node-data-orchestration"],
  },
  {
    id: "f-seed-partner-trend",
    ts: now - 26 * HOUR,
    kind: "opportunity",
    text: "Noticed partner-led implementations close 22% faster than direct, but partner health has been trending down for 3 weeks.",
    sources: ["Partner Hub"],
    nodeIds: ["node-partner-hub"],
  },
  {
    id: "f-seed-crm-sla",
    ts: now - 2 * 24 * HOUR,
    kind: "pain",
    text: "Flagging this: CRM data quality has been below 90% SLA for 11 consecutive days. Downstream playbooks are starting to misfire.",
    sources: ["CRM", "Salesforce"],
    nodeIds: ["node-crm"],
  },
  {
    id: "f-seed-renewal-cohort",
    ts: now - 3 * 24 * HOUR,
    kind: "risk",
    text: "Seeing a pattern: accounts with <60% feature adoption at day 60 churn at ~3× the baseline rate.",
    sources: ["Product Usage"],
    nodeIds: ["node-csm", "node-deployment-intelligence"],
  },
];

function read(): Finding[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Finding[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED;
    return parsed;
  } catch {
    return SEED;
  }
}

function write(items: Finding[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_FINDINGS)));
  } catch {
    /* localStorage unavailable */
  }
}

export function getFindings(limit = 6): Finding[] {
  return [...read()].sort((a, b) => b.ts - a.ts).slice(0, limit);
}

export function addFinding(f: Omit<Finding, "id" | "ts">): Finding {
  const finding: Finding = {
    ...f,
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  };
  const next = [finding, ...read()].slice(0, MAX_FINDINGS);
  write(next);
  // Notify same-tab listeners (storage events don't fire in the originating tab).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cs-rescue:findings-updated"));
  }
  return finding;
}

export function relativeTime(ts: number, nowMs = Date.now()): string {
  const diff = Math.max(0, nowMs - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

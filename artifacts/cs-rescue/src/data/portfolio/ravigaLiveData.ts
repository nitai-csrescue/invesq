// ---------------------------------------------------------------------------
// Raviga-tenant-only simulated "live data" layer.
//
// This powers the Phase 2 connected-data demo shown ONLY when
// `firmSlug === "raviga"` (isRaviga). Every value here is a PURE,
// DETERMINISTIC function of a company id/slug (no randomness, no network
// calls, no writes, no dependency on wall-clock "now") — the same company
// always renders the same "live" numbers on every request, which is what
// makes the demo safe to show repeatedly and safe to diff against.
//
// This file must only ever be imported from Raviga-gated call sites
// (isRaviga / firmSlug === "raviga" checks at the call site). It never
// touches @workspace/portfolio-engine's composite/weighted math and is never
// imported by stg/pamlico/longarc/solen pages.
// ---------------------------------------------------------------------------
import type { Company } from "./types";
import { PILLARS } from "./pillars";

// ---------------------------------------------------------------------------
// Deterministic hash — same input always produces the same non-negative int.
// ---------------------------------------------------------------------------
function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------
export type ConnectorId = "salesforce" | "gainsight" | "gong" | "product-telemetry";

export const CONNECTOR_DEFS: {
  id: ConnectorId;
  displayName: string;
  cardLabel: string; // matches the existing Phase2Integrations card labels
  recordBase: number;
}[] = [
  { id: "salesforce", displayName: "Salesforce", cardLabel: "CRM", recordBase: 4200 },
  { id: "gainsight", displayName: "Gainsight", cardLabel: "CS Platform", recordBase: 1800 },
  { id: "gong", displayName: "Gong", cardLabel: "Conversation Intelligence", recordBase: 950 },
  { id: "product-telemetry", displayName: "Product Telemetry", cardLabel: "Product Telemetry", recordBase: 62000 },
];

export const SIMULATED_CONNECTION_LABEL = "Simulated connection — demo environment";

export interface ConnectorLiveStatus {
  id: ConnectorId;
  displayName: string;
  connected: true;
  lastSyncedMinutesAgo: number;
  recordCount: number;
  label: string;
}

export function getConnectorLiveStatus(companyId: string, connectorId: ConnectorId): ConnectorLiveStatus {
  const def = CONNECTOR_DEFS.find((c) => c.id === connectorId);
  if (!def) throw new Error(`Unknown connector: ${connectorId}`);
  const seed = hashString(`${companyId}:${connectorId}`);
  return {
    id: connectorId,
    displayName: def.displayName,
    connected: true,
    lastSyncedMinutesAgo: 2 + (seed % 58), // 2–59 minutes ago
    recordCount: def.recordBase + (seed % 400),
    label: SIMULATED_CONNECTION_LABEL,
  };
}

export interface ConnectorFirmSummary {
  id: ConnectorId;
  displayName: string;
  recordCount: number;
  lastSyncedMinutesAgo: number;
}

// Aggregated across every company in the firm — used on the Data Sources page.
export function getFirmConnectorSummary(companies: Company[]): ConnectorFirmSummary[] {
  return CONNECTOR_DEFS.map((def) => {
    let totalRecords = 0;
    let minSync = 59;
    for (const c of companies) {
      const status = getConnectorLiveStatus(c.id, def.id);
      totalRecords += status.recordCount;
      minSync = Math.min(minSync, status.lastSyncedMinutesAgo);
    }
    return {
      id: def.id,
      displayName: def.displayName,
      recordCount: totalRecords,
      lastSyncedMinutesAgo: companies.length > 0 ? minSync : 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Weighted-composite confidence band (ARR forecast View B)
// ---------------------------------------------------------------------------
// A "tightened" confidence band, illustrating that connected proprietary data
// narrows forecast uncertainty vs. the external-signal-only Phase 1 model.
export function getArrConfidenceBandPct(company: Company): number {
  const seed = hashString(`${company.id}:confidence`);
  return 2.5 + (seed % 20) / 10; // 2.5%–4.4%
}

// ---------------------------------------------------------------------------
// NRR / GRR (simulated CRM-derived retention metrics)
// ---------------------------------------------------------------------------
export interface RetentionMetrics {
  grr: number; // Gross Revenue Retention, %
  nrr: number; // Net Revenue Retention, %
}

export function getRetentionMetrics(company: Company): RetentionMetrics {
  const seed = hashString(`${company.id}:retention`);
  const grr = 82 + (seed % 15); // 82–96
  const revenueScore = company.scores.revenue;
  const expansionUplift =
    revenueScore === 2 ? 18 : revenueScore === 1 ? 10 : revenueScore === 0 ? 3 : 8;
  const nrr = grr + expansionUplift + (seed % 5);
  return { grr, nrr };
}

// ---------------------------------------------------------------------------
// Live Signals (RavigaFindings "Live Signals" section)
// ---------------------------------------------------------------------------
export type LiveSignalSeverity = "High" | "Medium" | "Low";

export interface LiveSignal {
  id: string;
  companyId: string;
  companyName: string;
  source: ConnectorId;
  sourceLabel: string;
  pillarId: string;
  pillarName: string;
  severity: LiveSignalSeverity;
  daysAgo: number; // 0–13, always ≤ 14 days old
  message: string;
}

const SIGNAL_TEMPLATES: Record<string, { source: ConnectorId; message: string }[]> = {
  org: [
    { source: "salesforce", message: "2 CSM territories reassigned in the last week without a documented backfill plan." },
    { source: "gainsight", message: "CSM-to-account ratio increased 14% following a team departure." },
  ],
  onboarding: [
    { source: "product-telemetry", message: "New-cohort time-to-first-value trending 18% slower than the prior quarter." },
    { source: "gainsight", message: "3 recently onboarded accounts have not reached their first success milestone." },
  ],
  health: [
    { source: "gainsight", message: "Health score dropped from Healthy to At Risk for 3 accounts in the last 7 days." },
    { source: "product-telemetry", message: "Weekly active usage declined >20% for 2 top-10 accounts." },
  ],
  escalation: [
    { source: "gong", message: "Negative sentiment detected in 2 of the last 5 recorded support/escalation calls." },
    { source: "salesforce", message: "Open escalation case count is 30% above the trailing-90-day average." },
  ],
  revenue: [
    { source: "salesforce", message: "4 open expansion opportunities have stalled in-stage for more than 21 days." },
    { source: "gong", message: "Upsell mentions in customer calls down sharply vs. the prior month." },
  ],
  leadership: [
    { source: "gainsight", message: "CS leadership dashboard has gone unopened for 12 consecutive days." },
    { source: "salesforce", message: "No CS-leader-attributed activity logged on top-20 accounts this cycle." },
  ],
  planning: [
    { source: "salesforce", message: "3 top-20 accounts are overdue for a scheduled QBR." },
    { source: "gainsight", message: "Success-plan completion rate fell below 60% this quarter." },
  ],
  ai: [
    { source: "product-telemetry", message: "AI-assisted ticket deflection rate down 6 points week-over-week." },
    { source: "gong", message: "AI call-summary adoption among CSMs remains under 25%." },
  ],
};

const CONNECTOR_LABEL_BY_ID: Record<ConnectorId, string> = Object.fromEntries(
  CONNECTOR_DEFS.map((d) => [d.id, d.displayName]),
) as Record<ConnectorId, string>;

function severityForScore(score: Company["scores"][string]): LiveSignalSeverity {
  if (score === 0) return "High";
  if (score === 1) return "Medium";
  if (score === 2) return "Low";
  return "Medium"; // Insufficient Data — treat as worth surfacing, not dismissed
}

// Returns 3–5 deterministic signals for a company, spread across distinct
// pillars, each dated within the last 14 days.
export function getLiveSignalsForCompany(company: Company): LiveSignal[] {
  const seed = hashString(`${company.id}:signals`);
  const count = 3 + (seed % 3); // 3, 4, or 5

  const pillarOrder = PILLARS.map((p, idx) => idx).sort(
    (a, b) => ((seed + a * 13) % 97) - ((seed + b * 13) % 97),
  );

  const signals: LiveSignal[] = [];
  for (let i = 0; i < count; i++) {
    const pillar = PILLARS[pillarOrder[i % pillarOrder.length]];
    const templates = SIGNAL_TEMPLATES[pillar.id];
    const template = templates[(seed + i * 3) % templates.length];
    signals.push({
      id: `${company.id}-signal-${i}`,
      companyId: company.id,
      companyName: company.name,
      source: template.source,
      sourceLabel: CONNECTOR_LABEL_BY_ID[template.source],
      pillarId: pillar.id,
      pillarName: pillar.name,
      severity: severityForScore(company.scores[pillar.id]),
      daysAgo: (seed + i * 5) % 14,
      message: template.message,
    });
  }
  return signals.sort((a, b) => a.daysAgo - b.daysAgo);
}

export function getLiveSignalsForCompanies(companies: Company[]): LiveSignal[] {
  return companies.flatMap(getLiveSignalsForCompany).sort((a, b) => a.daysAgo - b.daysAgo);
}

// ---------------------------------------------------------------------------
// Data Sources page — governance matrix + semantic layer (static reference
// content, not per-company; describes how the simulated connectors above are
// governed/modeled in this demo).
// ---------------------------------------------------------------------------
export interface GovernanceRow {
  domain: string;
  owner: string;
  classification: "Public" | "Internal" | "Confidential" | "Restricted";
  retention: string;
  lastReviewed: string;
}

export const GOVERNANCE_MATRIX: GovernanceRow[] = [
  {
    domain: "CRM (Salesforce)",
    owner: "RevOps",
    classification: "Confidential",
    retention: "7 years",
    lastReviewed: "2026-05-02",
  },
  {
    domain: "CS Platform (Gainsight)",
    owner: "Customer Success Ops",
    classification: "Confidential",
    retention: "5 years",
    lastReviewed: "2026-05-14",
  },
  {
    domain: "Conversation Intelligence (Gong)",
    owner: "Sales Enablement",
    classification: "Restricted",
    retention: "18 months",
    lastReviewed: "2026-04-28",
  },
  {
    domain: "Product Telemetry",
    owner: "Data Engineering",
    classification: "Internal",
    retention: "3 years",
    lastReviewed: "2026-05-20",
  },
];

export interface SemanticLayerEntity {
  name: string;
  description: string;
  sourceSystem: string;
  grain: string;
}

export const SEMANTIC_LAYER: SemanticLayerEntity[] = [
  {
    name: "customer_health_score",
    description:
      "Composite health index blended from product usage, support sentiment, and CSM qualitative input.",
    sourceSystem: "Gainsight → dbt",
    grain: "1 row per account per day",
  },
  {
    name: "expansion_pipeline",
    description: "Open expansion opportunities with stage, amount, and CS-influence flag.",
    sourceSystem: "Salesforce → dbt",
    grain: "1 row per opportunity",
  },
  {
    name: "conversation_risk_signal",
    description: "NLP-derived risk/sentiment tags extracted from recorded customer calls.",
    sourceSystem: "Gong → dbt",
    grain: "1 row per call",
  },
  {
    name: "product_adoption_event",
    description: "Feature-level usage events rolled up to weekly active breadth and depth metrics.",
    sourceSystem: "Product Telemetry → dbt",
    grain: "1 row per account per week",
  },
];

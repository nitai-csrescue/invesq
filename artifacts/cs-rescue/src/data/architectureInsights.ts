import type { Persona } from "@/lib/persona";

export type ArchInsightKind = "risk" | "opportunity" | "pain" | "action";
export type ArchInsightScope = "company" | "customer";
export type ArchInsightSeverity = "high" | "medium" | "low";

export interface ArchInsight {
  id: string;
  kind: ArchInsightKind;
  scope: ArchInsightScope;
  severity: ArchInsightSeverity;
  title: string;
  body: string;
  metric?: string;
  personas: Persona[];
  accountId?: string;
  nodeIds: string[];
  edgeIds?: string[];
  /** Signal/data sources that contributed to this insight, e.g. "Support", "CRM". */
  sources?: string[];
  cta?: { label: string; href: string };
  copilotPrompt?: string;
}

const ALL_PERSONAS: Persona[] = ["vp", "sales", "post-sales", "cs", "support", "engineering", "customer"];

export const archInsights: ArchInsight[] = [
  {
    id: "ai_company_ttv_cliff",
    kind: "pain",
    scope: "company",
    severity: "high",
    title: "Time-to-value is 47 days — 17 days over target",
    body: "Implementation handoff to CSM is the bottleneck. Deployment Intelligence flagged 6 active risk flags this week, all in the first 30 days post-contract.",
    metric: "47d / 30d target",
    personas: ["vp", "post-sales", "cs", "engineering"],
    nodeIds: ["node-implementation", "node-csm", "node-deployment-intelligence"],
    edgeIds: ["e-impl-csm"],
    sources: ["Implementation", "Deployment Intelligence", "CSM"],
    cta: { label: "Activate TTV recovery playbook", href: "/playbooks?playbookId=pb-ttv-recovery" },
    copilotPrompt: "Why is our TTV 17 days over target and what's the fastest fix?",
  },
  {
    id: "ai_company_support_backlog",
    kind: "pain",
    scope: "company",
    severity: "high",
    title: "Support backlog up 23% — early churn signal",
    body: "Open cases surged in the last 14 days. CSM escalations from Support correlate with 3 of our top 5 at-risk accounts.",
    metric: "+23% open cases",
    personas: ["vp", "cs", "support", "post-sales"],
    nodeIds: ["node-support", "node-case-management", "node-csm"],
    edgeIds: ["e-csm-support"],
    sources: ["Support", "Case Management", "Zendesk"],
    cta: { label: "Triage support escalations", href: "/signals?category=support" },
    copilotPrompt: "Map the support backlog to at-risk accounts and prioritize triage.",
  },
  {
    id: "ai_company_expansion_pipeline",
    kind: "opportunity",
    scope: "company",
    severity: "medium",
    title: "$1.1M expansion pipeline across 13 accounts",
    body: "CSM-flagged seat expansion + product usage growth. Pre-sales handoff for renewals is the highest-leverage next step.",
    metric: "+$1.1M ARR",
    personas: ["vp", "sales", "post-sales", "cs"],
    nodeIds: ["node-csm", "node-pre-sales", "node-contract"],
    sources: ["CSM", "Product Usage", "CRM"],
    cta: { label: "View expansion accounts", href: "/dashboard" },
    copilotPrompt: "Build a 30-day plan to convert the $1.1M expansion pipeline.",
  },
  {
    id: "ai_company_decisioning_drift",
    kind: "action",
    scope: "company",
    severity: "medium",
    title: "Decisioning model accuracy down 3 pts this week",
    body: "Data Orchestration freshness dipped to 91%. Engineering should re-train and validate before next renewal cohort.",
    metric: "−3 pts accuracy",
    personas: ["engineering", "post-sales", "vp"],
    nodeIds: ["node-decisioning", "node-data-orchestration", "node-deployment-intelligence"],
    sources: ["Decisioning", "Data Orchestration"],
    cta: { label: "Open Architecture detail", href: "/platform/architecture" },
    copilotPrompt: "Diagnose decisioning model drift root-cause and propose mitigations.",
  },
  {
    id: "ai_company_partner_underused",
    kind: "opportunity",
    scope: "company",
    severity: "low",
    title: "Partner hub underutilized — 60% of partners <50% health",
    body: "Partner-led implementations close 22% faster, but partner health is sagging. Re-engagement plays could lift TTV across the board.",
    metric: "60% under threshold",
    personas: ["vp", "sales", "post-sales"],
    nodeIds: ["node-partner-hub", "node-csm"],
    sources: ["Partner Hub", "CSM"],
    cta: { label: "Run partner re-engagement", href: "/playbooks?playbookId=pb-partner-reactivate" },
    copilotPrompt: "Which partners should we re-engage first and why?",
  },
  {
    id: "ai_company_crm_data_quality",
    kind: "pain",
    scope: "company",
    severity: "medium",
    title: "CRM data quality at 78% — below 90% SLA",
    body: "Stale account records degrade Decisioning + downstream playbooks. Engineering + RevOps joint clean-up needed.",
    metric: "78% / 90% SLA",
    personas: ["engineering", "post-sales", "cs"],
    nodeIds: ["node-crm", "node-data-orchestration", "node-decisioning"],
    sources: ["CRM", "Salesforce"],
    cta: { label: "Open CRM integration", href: "/integrations" },
    copilotPrompt: "Where is CRM data quality hurting us the most?",
  },
  {
    id: "ai_customer_wayne_risk",
    kind: "risk",
    scope: "customer",
    severity: "high",
    accountId: "a_wayne",
    title: "Wayne Enterprises — $480k ARR at risk",
    body: "Usage cliff (−41%) + lost executive sponsor + open P1 ticket. Renewal in 42 days. Support and CSM signals both red.",
    metric: "−$480k ARR risk",
    personas: ALL_PERSONAS,
    nodeIds: ["node-csm", "node-support", "node-case-management", "node-deployment-intelligence"],
    sources: ["CSM", "Support", "Product Usage"],
    cta: { label: "Open Wayne account", href: "/accounts?accountId=a_wayne" },
    copilotPrompt: "Brief me on Wayne Enterprises risk and what to do this week.",
  },
  {
    id: "ai_customer_stark_expand",
    kind: "opportunity",
    scope: "customer",
    severity: "high",
    accountId: "a_stark",
    title: "Stark Industries — $240k expansion primed",
    body: "Seat utilization at 91% with positive trend. Buying committee asked for enterprise SSO pricing. Joint CS+AE brief overdue 4 days.",
    metric: "+$240k ARR",
    personas: ALL_PERSONAS,
    nodeIds: ["node-csm", "node-pre-sales", "node-contract"],
    sources: ["CSM", "Product Usage", "Sales"],
    cta: { label: "Open Stark account", href: "/accounts?accountId=a_stark" },
    copilotPrompt: "Build the expansion plan for Stark Industries.",
  },
  {
    id: "ai_customer_ingen_ttv",
    kind: "risk",
    scope: "customer",
    severity: "medium",
    accountId: "a_ingen",
    title: "InGen onboarding stalled — 3 of 8 milestones",
    body: "90 days in, champion missing last 3 syncs. Implementation + Lifecycle Playbooks need to re-engage to protect the renewal.",
    metric: "3 / 8 milestones",
    personas: ALL_PERSONAS,
    nodeIds: ["node-implementation", "node-lifecycle-playbooks", "node-csm"],
    sources: ["Implementation", "Playbooks"],
    cta: { label: "Open InGen account", href: "/accounts?accountId=a_ingen" },
    copilotPrompt: "Why is InGen onboarding stalled, and how do we restart it without losing the renewal?",
  },
];

export function filterArchInsights({
  persona,
  scope,
  accountId,
}: {
  persona: Persona;
  scope: ArchInsightScope;
  accountId?: string | null;
}): ArchInsight[] {
  return archInsights
    .filter((i) => i.scope === scope)
    .filter((i) => i.personas.includes(persona))
    .filter((i) => {
      if (scope !== "customer") return true;
      if (!accountId) return true;
      return i.accountId === accountId;
    })
    .sort((a, b) => {
      const sev = { high: 0, medium: 1, low: 2 };
      if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
      return a.title.localeCompare(b.title);
    })
    .slice(0, 5);
}

export type SignalCategory = "churn" | "expansion" | "adoption" | "renewal" | "support";
export type SignalSeverity = "low" | "med" | "high";

export interface SignalDefinition {
  id: string;
  category: SignalCategory;
  name: string;
  description: string;
  dataSources: string[];
  pattern: string;
  triggersAction: string;
}

export interface SignalEvent {
  id: string;
  defId: string;
  accountId: string;
  firedAt: string;
  severity: SignalSeverity;
  detail: string;
}

export const SIGNAL_CATEGORIES: { id: SignalCategory; label: string; description: string; tone: string }[] = [
  { id: "churn", label: "Churn Risk", description: "Patterns that predict revenue at risk before renewal.", tone: "rose" },
  { id: "expansion", label: "Expansion", description: "Patterns that surface seat, module, or tier upsell opportunities.", tone: "emerald" },
  { id: "adoption", label: "Adoption", description: "Patterns that reveal stalled, slow, or shallow product adoption.", tone: "amber" },
  { id: "renewal", label: "Renewal", description: "Patterns that flag renewal motion health and procurement risk.", tone: "indigo" },
  { id: "support", label: "Support Escalation", description: "Patterns that detect support friction spilling into CS risk.", tone: "sky" },
];

export const signalDefinitions: SignalDefinition[] = [
  {
    id: "sig_usage_drop",
    category: "churn",
    name: "Usage cliff detected",
    description: "Weekly active users dropped >25% in a 14-day window without a known holiday/seasonal cause.",
    dataSources: ["Product Analytics", "Workspace Telemetry"],
    pattern: "Compares trailing 14d WAU vs trailing 28d WAU. Suppresses known seasonality.",
    triggersAction: "Run Retention Save playbook · alert account owner · open executive check-in task.",
  },
  {
    id: "sig_champion_left",
    category: "churn",
    name: "Champion departure",
    description: "Primary champion or executive sponsor changed roles, was deactivated, or stopped logging in.",
    dataSources: ["CRM", "HRIS Webhook", "Workspace Auth"],
    pattern: "Detects role change in CRM contact OR 30+ days of inactivity from contact tagged ‘champion’.",
    triggersAction: "Open ‘New Champion Identification’ playbook · pause expansion outreach.",
  },
  {
    id: "sig_p1_unresolved",
    category: "support",
    name: "P1 ticket unresolved >7 days",
    description: "Critical (P1) support ticket open longer than SLA threshold.",
    dataSources: ["Zendesk", "Intercom"],
    pattern: "Joins ticket priority + open duration + linked account; escalates if account ARR > $250k.",
    triggersAction: "Notify CSM · executive escalation · auto-block expansion-stage actions.",
  },
  {
    id: "sig_seat_expansion",
    category: "expansion",
    name: "Seat utilization >85%",
    description: "Provisioned seats are nearly fully consumed and growing.",
    dataSources: ["Product Analytics", "Billing"],
    pattern: "Tracks provisioned vs active seats trailing 30 days; flags when active/provisioned > 0.85 with positive slope.",
    triggersAction: "Trigger Expansion Plan · brief CSM with seat-pack pricing.",
  },
  {
    id: "sig_module_pilot",
    category: "expansion",
    name: "Module POC opened",
    description: "Account began evaluating a paid add-on module or new tier.",
    dataSources: ["Product Analytics", "Sales Logs"],
    pattern: "Detects first-time use of premium-tagged feature OR sales-logged POC opportunity.",
    triggersAction: "Brief AE + CSM jointly · queue Expansion Plan playbook.",
  },
  {
    id: "sig_onboarding_stall",
    category: "adoption",
    name: "Onboarding milestone stalled",
    description: "Customer hasn’t completed an onboarding milestone in 30+ days.",
    dataSources: ["Product Analytics", "Onboarding Workflow"],
    pattern: "Tracks milestone-to-milestone time; flags when current milestone idle > 30d.",
    triggersAction: "Run Re-onboarding playbook · assign onboarding lead.",
  },
  {
    id: "sig_shallow_adoption",
    category: "adoption",
    name: "Shallow module adoption",
    description: "Account uses fewer than 30% of the modules typical of similar customers in their segment.",
    dataSources: ["Product Analytics", "Peer Benchmarks"],
    pattern: "Compares modules used to peer-segment median; flags when ratio < 0.3 after 90 days live.",
    triggersAction: "Schedule adoption workshop · seed playbook with peer-benchmark insight.",
  },
  {
    id: "sig_renewal_window",
    category: "renewal",
    name: "Renewal window opened — no QBR",
    description: "Account is within 60 days of renewal with no QBR booked.",
    dataSources: ["CRM", "Calendar"],
    pattern: "Joins renewal date with QBR meeting log; flags missing QBR inside renewal window.",
    triggersAction: "Force-schedule QBR · notify renewals manager.",
  },
  {
    id: "sig_procurement_signal",
    category: "renewal",
    name: "Procurement engagement detected",
    description: "Procurement team or vendor management touched the account.",
    dataSources: ["CRM", "Email Telemetry"],
    pattern: "Detects new contact with procurement-pattern title OR vendor consolidation keyword in email subjects.",
    triggersAction: "Activate Renewal Defense playbook · brief account team within 4h.",
  },
  {
    id: "sig_ticket_volume_spike",
    category: "support",
    name: "Support ticket volume spike",
    description: "Account opened 3x its normal ticket volume in the past 14 days.",
    dataSources: ["Zendesk", "Intercom"],
    pattern: "Compares trailing 14d ticket count to trailing 90d baseline; flags when ratio > 3.",
    triggersAction: "Joint CS+Support sync · publish workaround · risk-tag account.",
  },
];

export const signalEvents: SignalEvent[] = [
  { id: "se1", defId: "sig_usage_drop", accountId: "a_wayne", firedAt: "2026-04-19", severity: "high", detail: "WAU 312 → 184 in 14d (-41%)" },
  { id: "se2", defId: "sig_p1_unresolved", accountId: "a_wayne", firedAt: "2026-04-20", severity: "high", detail: "P1 #4821 open 9 days" },
  { id: "se3", defId: "sig_renewal_window", accountId: "a_umbrella", firedAt: "2026-04-21", severity: "high", detail: "Renews in 21 days — no QBR scheduled" },
  { id: "se4", defId: "sig_procurement_signal", accountId: "a_umbrella", firedAt: "2026-04-16", severity: "high", detail: "Vendor consolidation review requested" },
  { id: "se5", defId: "sig_seat_expansion", accountId: "a_stark", firedAt: "2026-04-18", severity: "med", detail: "Seat utilization at 91%, +18% MoM" },
  { id: "se6", defId: "sig_module_pilot", accountId: "a_hooli", firedAt: "2026-04-20", severity: "med", detail: "Analytics module POC opened" },
  { id: "se7", defId: "sig_onboarding_stall", accountId: "a_ingen", firedAt: "2026-04-15", severity: "med", detail: "3 of 8 milestones complete after 90 days" },
  { id: "se8", defId: "sig_shallow_adoption", accountId: "a_acme", firedAt: "2026-04-17", severity: "med", detail: "Using 4/12 modules vs peer median 9" },
  { id: "se9", defId: "sig_ticket_volume_spike", accountId: "a_cyberdyne", firedAt: "2026-04-19", severity: "med", detail: "Tickets up 3.2x trailing 14d" },
  { id: "se10", defId: "sig_champion_left", accountId: "a_soylent", firedAt: "2026-04-12", severity: "high", detail: "Champion on extended leave; logins halved" },
  { id: "se11", defId: "sig_module_pilot", accountId: "a_aperture", firedAt: "2026-04-19", severity: "low", detail: "Pricing inquiry on platform tier" },
  { id: "se12", defId: "sig_seat_expansion", accountId: "a_pied_piper", firedAt: "2026-04-16", severity: "low", detail: "97% seats active; 25 more requested" },
];

export function getSignalDefinition(id: string) {
  return signalDefinitions.find((s) => s.id === id);
}

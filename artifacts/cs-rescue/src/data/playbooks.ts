export type PlaybookCategory =
  | "Onboarding"
  | "Adoption"
  | "Retention"
  | "Expansion"
  | "Renewal"
  | "Custom";
export type PlaybookStatus = "active" | "draft" | "paused";

export interface PlaybookStep {
  title: string;
  description: string;
  done?: boolean;
}

export interface PlaybookOutcome {
  metric: string;
  value: string;
}

export interface Playbook {
  id: string;
  name: string;
  category: PlaybookCategory;
  objective: string;
  triggerCondition: string;
  stage: string;
  ownerId: string;
  status: PlaybookStatus;
  outcomes: PlaybookOutcome[];
  steps: PlaybookStep[];
  activeAccounts: string[];
  runsLast30Days: number;
}

export const PLAYBOOK_CATEGORIES: PlaybookCategory[] = [
  "Onboarding",
  "Adoption",
  "Retention",
  "Expansion",
  "Renewal",
  "Custom",
];

export const playbooks: Playbook[] = [
  {
    id: "pb_onboarding_fast",
    name: "Fast Onboarding",
    category: "Onboarding",
    objective: "Get new accounts to first value within 14 days.",
    triggerCondition: "New contract signed; account provisioned.",
    stage: "Days 0–14",
    ownerId: "u_jordan",
    status: "active",
    outcomes: [
      { metric: "Median time-to-first-value", value: "21 → 13 days" },
      { metric: "30-day adoption rate", value: "62% → 81%" },
    ],
    steps: [
      { title: "Auto kickoff email", description: "Send branded kickoff with 3-step quickstart link.", done: true },
      { title: "Provision admin checklist", description: "Create checklist in workspace and assign owner.", done: true },
      { title: "Day-3 office hours invite", description: "Invite admins to a live office hours session.", done: true },
      { title: "Day-7 milestone review", description: "CSM reviews onboarding milestones with champion." },
      { title: "Day-14 success criteria check", description: "Confirm first-value criteria met or escalate." },
    ],
    activeAccounts: ["a_pied_piper", "a_sterling"],
    runsLast30Days: 14,
  },
  {
    id: "pb_reonboard",
    name: "Re-Onboarding",
    category: "Onboarding",
    objective: "Restart onboarding for accounts that stalled past 30 days.",
    triggerCondition: "Onboarding milestone stalled signal fires.",
    stage: "Days 30+",
    ownerId: "u_jordan",
    status: "active",
    outcomes: [
      { metric: "Onboarding completion", value: "+34%" },
    ],
    steps: [
      { title: "Diagnostic session", description: "30-min call to identify blockers." },
      { title: "Re-baseline milestones", description: "Reset milestone plan with new champion if needed." },
      { title: "Weekly executive nudge", description: "Send weekly 1-line progress update to sponsor." },
    ],
    activeAccounts: ["a_ingen"],
    runsLast30Days: 6,
  },
  {
    id: "pb_adoption_workshop",
    name: "Adoption Workshop",
    category: "Adoption",
    objective: "Lift module breadth above peer benchmark.",
    triggerCondition: "Shallow module adoption signal fires.",
    stage: "Days 60+",
    ownerId: "u_priya",
    status: "active",
    outcomes: [
      { metric: "Modules used per account", value: "+2.4 modules" },
      { metric: "Health score change", value: "+18 pts in 60 days" },
    ],
    steps: [
      { title: "Identify under-used modules", description: "Pull peer-benchmark gap analysis." },
      { title: "90-min hands-on workshop", description: "Live walkthrough with admin + champion." },
      { title: "30-day follow-up", description: "Verify adoption sustained." },
    ],
    activeAccounts: ["a_acme"],
    runsLast30Days: 9,
  },
  {
    id: "pb_retention_save",
    name: "Retention Save",
    category: "Retention",
    objective: "Recover at-risk accounts before they churn.",
    triggerCondition: "Health score < 50 OR usage cliff signal fires.",
    stage: "Pre-renewal · 60–90 days",
    ownerId: "u_alex",
    status: "active",
    outcomes: [
      { metric: "Saved ARR (last 90d)", value: "$2.1M" },
      { metric: "Save rate", value: "61%" },
    ],
    steps: [
      { title: "Executive sponsor sync", description: "VP CS schedules 1:1 with customer exec sponsor." },
      { title: "Joint root-cause review", description: "Surface top 3 risk drivers with evidence." },
      { title: "Recovery commitment", description: "Customer commits to a 30-day recovery plan." },
      { title: "Weekly health review", description: "Track health score weekly with named owner." },
    ],
    activeAccounts: ["a_wayne", "a_cyberdyne", "a_soylent"],
    runsLast30Days: 11,
  },
  {
    id: "pb_renewal_defense",
    name: "Renewal Defense",
    category: "Renewal",
    objective: "Lock in at-risk renewals when procurement engages.",
    triggerCondition: "Procurement engagement signal OR <60 days to renewal with health <60.",
    stage: "Pre-renewal · 60 days",
    ownerId: "u_sam",
    status: "active",
    outcomes: [
      { metric: "Renewal win rate when triggered", value: "78%" },
    ],
    steps: [
      { title: "Brief account team within 4h", description: "Distribute risk briefing + business value summary." },
      { title: "Multi-thread the account", description: "Identify and engage 3+ stakeholders beyond champion." },
      { title: "ROI/value proof package", description: "Send tailored ROI summary to procurement." },
      { title: "Executive close", description: "VP-level call to close commitment." },
    ],
    activeAccounts: ["a_umbrella", "a_nakatomi"],
    runsLast30Days: 5,
  },
  {
    id: "pb_qbr",
    name: "Quarterly Business Review",
    category: "Renewal",
    objective: "Reinforce business value and surface expansion paths quarterly.",
    triggerCondition: "Account in renewal window OR quarterly cadence due.",
    stage: "Quarterly",
    ownerId: "u_priya",
    status: "active",
    outcomes: [
      { metric: "Expansion conversations opened", value: "+47%" },
    ],
    steps: [
      { title: "Pre-read package", description: "Send usage + outcome pre-read 5 days before." },
      { title: "QBR session", description: "60-min session: outcomes, roadmap, expansion." },
      { title: "Action follow-up", description: "Email recap with 3 next steps within 48h." },
    ],
    activeAccounts: ["a_stark", "a_hooli", "a_tyrell", "a_globex"],
    runsLast30Days: 12,
  },
  {
    id: "pb_expansion",
    name: "Expansion Plan",
    category: "Expansion",
    objective: "Convert seat or module signals into closed expansion ARR.",
    triggerCondition: "Seat utilization >85% OR module POC opened.",
    stage: "Anytime",
    ownerId: "u_priya",
    status: "active",
    outcomes: [
      { metric: "Pipeline created (last 90d)", value: "$1.8M" },
      { metric: "Win rate", value: "44%" },
    ],
    steps: [
      { title: "Joint CS + AE brief", description: "Align on opportunity size, stakeholders, timing." },
      { title: "Tailored business case", description: "Send ROI deck specific to use case." },
      { title: "Executive endorsement", description: "Secure exec sponsor sign-off." },
      { title: "Procurement handoff", description: "Move to AE-led close motion." },
    ],
    activeAccounts: ["a_stark", "a_hooli", "a_massive", "a_pied_piper", "a_tyrell", "a_aperture"],
    runsLast30Days: 19,
  },
  {
    id: "pb_champion_id",
    name: "New Champion Identification",
    category: "Custom",
    objective: "Identify and ramp a new champion when the existing one leaves.",
    triggerCondition: "Champion departure signal.",
    stage: "Anytime",
    ownerId: "u_kenji",
    status: "active",
    outcomes: [
      { metric: "Time to new champion", value: "Avg 18 days" },
    ],
    steps: [
      { title: "Identify candidate", description: "Pull top 3 power users by usage + role." },
      { title: "Personal outreach", description: "CSM-led outreach to candidate champions." },
      { title: "Champion enablement", description: "Run 60-min enablement on platform value." },
    ],
    activeAccounts: ["a_acme", "a_soylent"],
    runsLast30Days: 4,
  },
  {
    id: "pb_executive_checkin",
    name: "Executive Check-in",
    category: "Retention",
    objective: "Reset trust at the executive level when an account is slipping.",
    triggerCondition: "Manual trigger from VP CS or escalation.",
    stage: "Anytime",
    ownerId: "u_alex",
    status: "active",
    outcomes: [
      { metric: "Account health lift", value: "+12 pts avg" },
    ],
    steps: [
      { title: "Schedule exec sync", description: "VP CS reaches out to customer exec sponsor." },
      { title: "Listen & document", description: "Capture concerns, commitments, timelines." },
      { title: "Internal action plan", description: "Translate commitments into action queue." },
    ],
    activeAccounts: ["a_wayne"],
    runsLast30Days: 7,
  },
  {
    id: "pb_health_recovery",
    name: "Health Recovery",
    category: "Custom",
    objective: "Bring health score from at-risk back into watch/healthy.",
    triggerCondition: "Health score in 30–50 range for 30+ days.",
    stage: "Anytime",
    ownerId: "u_kenji",
    status: "draft",
    outcomes: [
      { metric: "Avg score lift", value: "+22 pts in 60d" },
    ],
    steps: [
      { title: "Drill into top 3 risk drivers", description: "Diagnose what's pulling score down." },
      { title: "Targeted interventions", description: "Adoption workshop, exec sync, ticket triage." },
      { title: "Weekly scorecard", description: "Share weekly recovery scorecard with sponsor." },
    ],
    activeAccounts: ["a_cyberdyne"],
    runsLast30Days: 0,
  },
];

export function getPlaybook(id: string) {
  return playbooks.find((p) => p.id === id);
}

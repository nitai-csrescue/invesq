export interface AIInsight {
  id: string;
  kind: "risk" | "expansion" | "ttv";
  title: string;
  body: string;
  accountId?: string;
  deltaUsd?: number;
  prompt: string;
}

export const insights: AIInsight[] = [
  {
    id: "ins_risk_wayne",
    kind: "risk",
    title: "Wayne Enterprises is at risk — $480k ARR",
    body: "Usage cliff (-41%) + lost executive sponsor + unresolved P1 ticket. Renewal in 42 days. Recommend immediate executive check-in.",
    accountId: "a_wayne",
    deltaUsd: -480000,
    prompt: "Brief me on Wayne Enterprises risk and what to do this week.",
  },
  {
    id: "ins_expansion_stark",
    kind: "expansion",
    title: "Stark Industries primed for $240k expansion",
    body: "Seat utilization at 91% with positive trend. Buying committee asked for enterprise SSO pricing. Joint CS+AE brief overdue by 4 days.",
    accountId: "a_stark",
    deltaUsd: 240000,
    prompt: "Build the expansion plan for Stark Industries — quantify the opportunity and outline next 3 actions.",
  },
  {
    id: "ins_ttv_ingen",
    kind: "ttv",
    title: "InGen onboarding stalled — TTV at risk",
    body: "Only 3 of 8 onboarding milestones complete after 90 days. Champion missing last 3 weekly syncs. Re-onboarding playbook recommended.",
    accountId: "a_ingen",
    prompt: "Why is InGen onboarding stalled, and how do we restart it without losing the renewal?",
  },
];

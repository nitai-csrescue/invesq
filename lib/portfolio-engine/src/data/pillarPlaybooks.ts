// ---------------------------------------------------------------------------
// Diagnostic-aligned CS playbook library (Raviga pilot).
//
// This is a NEW, separate library keyed to the 4-pillar rubric
// (RubricPillarDef.key from rubricV2.ts). It is intentionally unrelated to
// the lifecycle-demo playbooks in artifacts/cs-rescue/src/data/playbooks.ts
// (INVESQ product-demo content) — do not merge the two.
//
// Copy policy: taglines / whatItProduces / dimension text are CS Rescue's own
// generic methodology language — nothing tenant-specific, no client figures.
// masterPrompt and inputDataFormat are verbatim deliverable templates.
// ---------------------------------------------------------------------------
import type { RubricPillarDef } from "../rubricV2";
import type { RubricBand } from "../rubricV2";

/** Exact pillar key used for the 4-pillar rubric scores (e.g. "onboardingScore"). */
export type PillarPlaybookPillar = RubricPillarDef["key"];

/** Score bands that surface a playbook (High never triggers a recommendation). */
export type PillarPlaybookTriggerBand = Extract<RubricBand, "Low" | "Medium">;

export interface PillarPlaybookDimension {
  name: string;
  description: string;
}

export interface PillarPlaybook {
  id: string;
  pillar: PillarPlaybookPillar;
  title: string;
  tagline: string;
  triggerBands: PillarPlaybookTriggerBand[];
  whatItProduces: string[];
  dimensions: PillarPlaybookDimension[];
  /** Full master prompt, verbatim — copied to clipboard as-is. */
  masterPrompt: string;
  /** Verbatim input-data template that pairs with masterPrompt. */
  inputDataFormat: string;
}

export const pillarPlaybooks: PillarPlaybook[] = [
  {
    id: "delivery-implementation-best-practices",
    pillar: "onboardingScore",
    title: "Delivery & Implementation Best Practices",
    tagline:
      "A standardized, phase-gated implementation framework — from signed contract to hypercare exit — that turns onboarding from a founder-dependent art into a repeatable, coverage-ready process.",
    triggerBands: ["Low", "Medium"],
    whatItProduces: [
      "A maturity score (Low/Medium/High) for the org's implementation process, mapped to the Onboarding pillar rubric",
      "A phase-gate template (Scope -> Kickoff -> Build/Configuration -> Hypercare -> Steady-State Handoff) with entry/exit criteria per phase",
      "Per-account implementation health flags with root-cause drivers",
      "A RACI across Sales, Delivery/Implementation, CS, and Support",
    ],
    dimensions: [
      {
        name: "Scope & SOW Clarity",
        description: "Is scope documented, versioned, and referenced during change requests?",
      },
      {
        name: "Project Governance & Cadence",
        description: "Is there a named owner, fixed check-in cadence, and shared project plan?",
      },
      {
        name: "Configuration/Build Quality",
        description: "Is the build validated against a checklist before go-live?",
      },
      {
        name: "Hypercare Readiness & Exit Criteria",
        description: "Is there a defined hypercare period with explicit entry/exit criteria?",
      },
      {
        name: "Cross-Functional Handoff",
        description: "Is there a documented handoff from Sales to Delivery to CS/Support?",
      },
    ],
    masterPrompt: `I am a CS/Delivery leader at [COMPANY NAME], a B2B SaaS company. I need an independent assessment of our implementation/onboarding process maturity, scored against a Low/Medium/High rubric.

Your output must be analytical and grounded only in the data provided. Do not soften the assessment — be direct about gaps, even if the data suggests a process that mostly works "by heroics" rather than by design.

SCORING FRAMEWORK — evaluate our process across these five dimensions:
1. Scope & SOW Clarity: is scope documented, versioned, and referenced during change requests, or negotiated ad hoc per account?
2. Project Governance & Cadence: is there a named owner, fixed check-in cadence, and shared project plan per implementation?
3. Configuration/Build Quality: is the build validated against a checklist before go-live, or does "done" depend on the customer noticing problems?
4. Hypercare Readiness & Exit Criteria: is there a defined hypercare period with explicit entry/exit criteria, or does it fade out undefined?
5. Cross-Functional Handoff: is there a documented handoff from Sales to Delivery to CS/Support, or does context get lost at each pass?

MATURITY TIERS — assign ONE overall tier, plus one per dimension:
High: Documented phase-gate process applied consistently across accounts, named entry/exit criteria per phase, dedicated implementation role.
Medium: A process exists but is applied inconsistently; some structure, notable gaps.
Low: Ad hoc, person-dependent process; no written scope beyond the SOW; no defined hypercare exit.

INSTRUCTIONS:
1. Analyze all inputs holistically — do not overweight a single account
2. Score each of the five dimensions Low/Medium/High
3. Assign an overall maturity tier
4. Identify the top 2-3 structural gaps driving inconsistency across accounts
5. Draft a phase-gate template (Scope -> Kickoff -> Build/Configuration -> Hypercare -> Steady-State Handoff) with explicit entry/exit criteria per phase, calibrated to what the data shows is realistic for this org today
6. Draft a RACI (Responsible/Accountable/Consulted/Informed) across Sales, Delivery/Implementation, CS, and Support for each phase

OUTPUT FORMAT (STRICT):
Section 1 — Dimension Scores: table with columns Dimension | Score (Low/Medium/High) | Evidence | Gap Description
Section 2 — Overall Maturity Tier: one tier, with 2-3 sentence rationale
Section 3 — Top Structural Gaps: numbered list, 2-3 items, each with the account-level evidence that supports it
Section 4 — Phase-Gate Template: table with columns Phase | Entry Criteria | Exit Criteria | Typical Duration (based on the data provided)
Section 5 — RACI: table with columns Phase | Responsible | Accountable | Consulted | Informed

IMPORTANT GUIDELINES:
- Do not invent data that is not provided
- If data is missing for a dimension, say so explicitly rather than guessing
- Be specific: cite the actual account data behind each score, not generic best-practice language
- Be concise but substantive in your reasoning

--- PASTE YOUR IMPLEMENTATION DATA BELOW THIS LINE ---

[PASTE YOUR STRUCTURED IMPLEMENTATION SUMMARIES HERE]`,
    inputDataFormat: `Account Name: [NAME]
Contract Signed: [DATE]
Kickoff Date: [DATE]
Planned Go-Live: [DATE]
Actual Go-Live: [DATE]
Scope Changes: [Count and 1-line description of each]
Hypercare Start / End: [DATES, or "undefined end" if applicable]
Ticket Volume (weeks 1-8 post-go-live): [count, severity mix]
Implementation Owner: [name/role, or "no single owner"]
Notes: [1-2 sentence context — what went well or poorly]`,
  },
  {
    id: "decreasing-time-to-value",
    pillar: "onboardingScore",
    title: "Decreasing Time-to-Value",
    tagline:
      "A structured method for measuring, benchmarking, and shrinking the gap between contract signature and a customer's first realized value.",
    triggerBands: ["Low", "Medium"],
    whatItProduces: [
      "A per-account Time-to-Value (TTV) measurement, benchmarked into a Low/Medium/High tier",
      "A ranked list of root-cause TTV drivers (scope creep, stakeholder gaps, org-symmetry mismatches)",
      "A portfolio-level TTV distribution",
      "A milestone-based value-realization plan template plus expectation-setting language",
    ],
    dimensions: [
      {
        name: "Milestone/Value-Realization Definition",
        description: "Is a specific first-value event defined, distinct from go-live?",
      },
      {
        name: "Scope Discipline",
        description: "Are scope changes logged and reviewed, or does scope just expand?",
      },
      {
        name: "Organizational Symmetry",
        description: "Does the delivery model match how the customer org is actually structured?",
      },
      {
        name: "Expectation-Setting & Communication Cadence",
        description: "Are timeline and the definition of value explicitly communicated at kickoff?",
      },
      {
        name: "Data/Handoff Readiness",
        description: "Is the customer actually ready before kickoff starts the clock?",
      },
    ],
    masterPrompt: `I am a CS/Onboarding leader at [COMPANY NAME], a B2B SaaS company. I need an independent measurement of Time-to-Value (TTV) across a set of recently onboarded accounts, along with root-cause analysis of what is driving slow accounts.

Your output must be analytical and grounded only in the data provided. Do not default to blaming the customer — actively check for internal, controllable root causes (scope creep, organizational mismatch, unclear expectations) before attributing delay to external factors.

TTV DEFINITION: Time-to-Value is the number of days between contract signature and the defined "first value" milestone (not "go-live" -- go-live is a delivery event, first value is a customer-experienced event).

ROOT-CAUSE CATEGORIES -- for each account, identify which of these apply:
1. Scope Creep: undocumented or unreviewed scope expansion during implementation
2. Organizational Symmetry Mismatch: the delivery model assumed an org structure (single admin, technical buyer, etc.) that didn't match the customer's actual structure
3. Expectation Gap: timeline, roles, or definition of "value" were not explicitly communicated at kickoff
4. Readiness Gap: kickoff started before the customer's data, systems access, or internal stakeholder buy-in was actually in place

TIER BENCHMARKS -- classify each account's TTV as:
High (fast): at or below [TARGET_DAYS] days, or top quartile of the set provided
Medium: within 1.5x of [TARGET_DAYS], or middle of the set provided
Low (slow): more than 1.5x [TARGET_DAYS], or bottom quartile of the set provided
(If no target is provided, benchmark relative to the fastest account in the data set.)

INSTRUCTIONS -- for each account provided:
1. Calculate TTV in days
2. Assign a tier (High/Medium/Low) relative to the benchmark
3. Identify the top 1-2 root-cause drivers from the categories above, citing the specific evidence
4. Recommend 1-2 concrete fixes tied to the specific root cause identified

PORTFOLIO SUMMARY -- after evaluating all accounts, provide:
1. Median and range of TTV across all accounts
2. Distribution shape (tight cluster vs. long tail of outliers)
3. Most frequent root-cause category across the set
4. The single highest-leverage fix to prioritize first, with rationale

OUTPUT FORMAT (STRICT) -- return a structured table with these columns:
Account Name | TTV (days) | Tier (High/Medium/Low) | Root-Cause Driver(s) | Recommended Fix(es)
Followed by the Portfolio Summary as a separate section.

IMPORTANT GUIDELINES:
- Do not invent data that is not provided
- If the first-value milestone date is a proxy rather than a true "value" event, note that explicitly rather than treating it as precise
- Be specific and cite the account data behind each root-cause assignment
- Be concise but substantive in your reasoning

--- PASTE YOUR ACCOUNT DATA BELOW THIS LINE ---

[PASTE YOUR STRUCTURED ACCOUNT SUMMARIES HERE]`,
    inputDataFormat: `Account Name: [NAME]
Contract Signature Date: [DATE]
Kickoff Date: [DATE]
First-Value Milestone Date: [DATE, or note if this is a proxy]
Scope Changes: [Count and 1-line description of each]
Customer Org Structure: [e.g. single technical admin / multi-stakeholder non-technical / etc.]
Kickoff Expectations Set: [Y/N — what was communicated about timeline and "value," if anything]
Notes: [1-2 sentence context on what sped up or slowed down this account]`,
  },
  {
    id: "support-best-practices",
    pillar: "onboardingScore",
    title: "Support Best Practices",
    tagline:
      "A framework for defining and enforcing SLAs, tracking CSAT with intent, and closing the handoff gap between Delivery/Hypercare and steady-state Support and Account Management.",
    triggerBands: ["Low", "Medium"],
    whatItProduces: [
      "An SLA adherence scorecard by ticket severity/tier",
      "A CSAT trend read with root drivers behind low scores",
      "A list of accounts where support friction is quietly creating renewal risk",
      "A documented hypercare-to-support handoff checklist",
    ],
    dimensions: [
      {
        name: "SLA Definition & Adherence",
        description: "Are response/resolution targets defined by severity and tracked?",
      },
      {
        name: "CSAT / Quality of Resolution",
        description: "Is CSAT reviewed for root cause, not just averaged?",
      },
      {
        name: "Escalation Path Clarity",
        description: "Is there a documented escalation path for repeat/high-severity issues?",
      },
      {
        name: "AM-Support Alignment",
        description: "Does Account Management see ticket history before a renewal conversation?",
      },
      {
        name: "Hypercare-to-Support Handoff",
        description: "Is there a documented handoff record when hypercare ends?",
      },
    ],
    masterPrompt: `I am a CS/Support leader at [COMPANY NAME], a B2B SaaS company. I need an independent assessment of SLA adherence, CSAT drivers, and support-to-account-management alignment across a set of accounts.

Your output must be analytical and grounded only in the data provided. Do not be reassuring by default -- flag divergence between Account Management's stated health view and what the ticket/CSAT data actually shows, even if that divergence is uncomfortable.

SCORING FRAMEWORK -- evaluate across these five dimensions:
1. SLA Definition & Adherence: are response/resolution targets defined by severity, and is performance tracked against them?
2. CSAT / Quality of Resolution: is CSAT captured per ticket, and are low scores reviewed for root cause?
3. Escalation Path Clarity: is there a documented escalation path for high-severity or repeat issues?
4. AM-Support Alignment: does Account Management have visibility into ticket history and sentiment before a renewal conversation?
5. Hypercare-to-Support Handoff: is there a documented handoff record when hypercare ends?

MATURITY TIERS -- assign ONE overall tier, plus one per dimension:
High: SLA targets defined and consistently met; CSAT reviewed for themes; AM and Support share a common account-health view; documented handoff exists.
Medium: SLA exists but tracked inconsistently; CSAT collected but rarely reviewed for cause; AM and Support have partially overlapping views.
Low: No formal SLA, or informal only; CSAT untracked or unreviewed; AM and Support operate with no shared visibility; no defined handoff.

INSTRUCTIONS -- for each account provided:
1. Calculate SLA adherence (% of tickets meeting target, if a target exists; note explicitly if no target exists)
2. Summarize the CSAT trend and its top 1-2 drivers
3. Compare the ticket/CSAT data against Account Management's stated health view for that account, and flag any divergence
4. Assign a renewal-risk flag (Low/Medium/High) where support friction and AM's read diverge
5. Recommend 2 concrete actions

PORTFOLIO SUMMARY -- after evaluating all accounts, provide:
1. Overall SLA adherence rate across the set (or "no SLA defined" if applicable)
2. Accounts with the highest AM/Support divergence, ranked
3. Most common CSAT driver across the set
4. Draft hypercare-to-support handoff checklist (what should transfer: open issues, customer context, commitments made, named point of contact)

OUTPUT FORMAT (STRICT) -- return a structured table with these columns:
Account Name | SLA Adherence | CSAT Trend & Driver | AM Stated Health | Divergence Flag | Renewal-Risk Flag | Recommended Actions (2)
Followed by the Portfolio Summary as a separate section.

IMPORTANT GUIDELINES:
- Do not invent data that is not provided
- If no SLA target exists, state that plainly as a Low-maturity finding rather than inferring one
- Be specific: cite the actual ticket/CSAT evidence behind each flag
- Be concise but substantive in your reasoning

--- PASTE YOUR ACCOUNT DATA BELOW THIS LINE ---

[PASTE YOUR STRUCTURED ACCOUNT SUMMARIES HERE]`,
    inputDataFormat: `Account Name: [NAME]
Hypercare Exit Date: [DATE, or "still in hypercare" / "undefined"]
SLA Target: [e.g. "4hr response / 24hr resolution for Sev-1", or "none defined"]
Tickets (last 90 days): [count, severity mix, avg resolution time]
CSAT (most recent): [score, and 1-line theme from comments if available]
AM Stated Health: [AM's own current read on this account, in their words]
Notes: [1-2 sentence context on anything unusual]`,
  },
];

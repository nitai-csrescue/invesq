// ---------------------------------------------------------------------------
// Pamlico Capital portfolio — raw company inputs (public-signal Phase 1 data only)
// Each company has one assessment — its initial diagnostic.
// Append new assessments to perform re-runs (see FIRM-ONBOARDING.md).
// ---------------------------------------------------------------------------
import type { RawCompany } from "./types";

const PAMLICO_COMPANIES: RawCompany[] = [
  {
    id: "profisee",
    name: "Profisee",
    sector: "Master Data Management SaaS",
    hq: "Alpharetta, GA",
    employeesDisplay: "175",
    arrDisplay: "$10M–$20M",
    arrForRollup: [10_000_000, 20_000_000],
    confidence: "High",
    engagement:
      "Execution bridge — Planhat hygiene audit, BIW program operationalization, and playbook documentation ahead of the Director hire. 60–90 day engagement.",
    invesqSignal:
      "Mature CS design with a temporary execution gap — a targeted bridge engagement protects an already-strong program through the leadership transition.",
    summary:
      "The most mature CS motion in the portfolio — Planhat health scoring, a formal Business Impact Workshop program, mutual success plans within 30 days of close, and a commercial CSQL motion with variable comp tied to GRR. The single execution risk: the Director of CS seat is open, leaving the CCO carrying the team directly while an operationally aggressive 90-day plan waits for its owner.",
    assessments: [
      {
        date: "2026-06-10",
        pillarScores: {
          org: 2,
          onboarding: 2,
          health: 2,
          escalation: 2,
          revenue: 2,
          leadership: 1,
          planning: 2,
          ai: null,
        },
      },
    ],
    gapNotes: {
      leadership:
        "A dedicated CCO owns a well-designed CS vision. The gap is structural, not personal: the Director of CS seat is open, so execution capacity sits one layer thin. Bridging infrastructure — Planhat hygiene, BIW operationalization, playbook documentation — before the new Director lands protects the program's momentum.",
    },
  },
  {
    id: "ehs-insight",
    name: "EHS Insight",
    sector: "Environmental Health & Safety SaaS",
    hq: "Houston, TX",
    employeesDisplay: "75",
    arrDisplay: "$10M–$18M",
    arrForRollup: [10_000_000, 18_000_000],
    confidence: "High",
    engagement:
      "Infrastructure build — install health scoring, structured account planning, and a commercially accountable expansion motion on top of an already-strong support culture. 90-day engagement.",
    invesqSignal:
      "Six months post-close with CS already named a thesis priority — strong team, strong sentiment, no systems. Textbook infrastructure engagement.",
    summary:
      "A 20-person CS team — 26% of total headcount — delivering top-ranked support (G2 4.7, #1 in Relationship and Implementation) six months after Pamlico's close. The opportunity: that investment runs on relationships rather than systems. No health-scoring platform, no structured account planning, and module upsell is encouraged but not commercially owned. Pamlico's own investment thesis named CS expansion as a post-close priority — the infrastructure build is the natural next step.",
    assessments: [
      {
        date: "2026-06-12",
        pillarScores: {
          org: 1,
          onboarding: 2,
          health: 0,
          escalation: 2,
          revenue: 1,
          leadership: 1,
          planning: 0,
          ai: 0,
        },
      },
    ],
    gapNotes: {
      health:
        "Health Scoring: No CS platform signal at $10M+ ARR — customer health is visible through relationships, not data. A systematic blind spot worth closing early in the hold.",
      leadership:
        "CS leadership brings 48 months of tenure and deep customer relationships from a sales background. Pairing that stability with systematic CS infrastructure — health scoring, planning cadence, commercial accountability — converts a strong relationship culture into a scalable retention engine.",
      planning:
        "No structured account planning cadence — success plans, QBR structures, and documented expansion pathways are absent. With module upsell as a named thesis priority, a planning infrastructure is the enabling layer.",
      ai: "No CS platform or AI tooling in the CS motion — coverage runs on relationships and manual processes. Systematic tooling becomes an efficiency and retention lever at $10M+ ARR.",
      revenue:
        "Module upsell is encouraged but not commercially owned — CS carries no formal CSQL motion, expansion quota, or NRR accountability. Converting strong customer relationships into a structured expansion motion is the natural next commercial step.",
      org: "CS is a dedicated 20-person team — the gap is structural accountability rather than headcount. Clearer role separation between reactive support and proactive CS would sharpen the retention mandate.",
      onboarding:
        "Onboarding is a clear strength — G2 review data consistently highlights rapid implementation and strong initial support responsiveness.",
      escalation:
        "Escalation management is a standout strength — G2 #1 ranking in Relationship and Implementation reflects a team that resolves issues effectively and maintains strong customer sentiment.",
    },
  },
  {
    id: "ceati",
    name: "CEATI International",
    sector: "B2B Membership / Information Services (Electric Utilities)",
    hq: "—",
    employeesDisplay: "35",
    arrDisplay: "$10M–$20M",
    arrForRollup: [10_000_000, 20_000_000],
    confidence: "High",
    engagement:
      "Infrastructure build — scalable member-onboarding cadence, proactive account planning, and AI-assisted workflows so a two-person team can cover 157 member companies systematically. 90-day engagement.",
    invesqSignal:
      "A two-person post-sales team covering 157 member companies with a fully manual motion — tooling and process are the binding constraint, and the team has already articulated exactly what it needs.",
    summary:
      "A membership business with genuine land-and-expand economics — 21 programs across 157 member companies — served by a post-sales team of two. The customer success function is roughly six months old and being built from scratch: member onboarding is a manual task-creation process with no time-to-value framework, engagement is reactive and event-driven, and every account review requires 30–60 minutes of manual CRM research. The infrastructure build here is unusually well-defined because the team itself has already named the gaps.",
    assessments: [
      {
        date: "2026-06-25",
        pillarScores: {
          org: 1,
          onboarding: 0,
          health: 1,
          escalation: null,
          revenue: 1,
          leadership: 1,
          planning: 0,
          ai: 0,
        },
      },
    ],
    gapNotes: {
      onboarding:
        "Member onboarding is a fully manual task-creation process with no scalable cadence — new members risk reaching their first renewal conversation before they've activated.",
      planning:
        "No structured account planning cadence — 157 member companies are covered reactively with no documented success plans or review cycle. A systematic planning layer is the enabling infrastructure for proactive engagement at this scale.",
      ai:
        "Every account review requires 30–60 minutes of manual CRM research — AI-assisted workflows are the highest-leverage efficiency gain available to a two-person team covering this many accounts.",
      health:
        "Member health is tracked manually through event attendance and ad hoc check-ins rather than systematic signals. A lightweight health-scoring model would give the team early warning on at-risk accounts before renewal conversations.",
      revenue:
        "Revenue motion is developing — the land-and-expand economics are in place across 21 programs, but the commercial playbook for converting member engagement into program expansion is not yet systematized.",
      leadership:
        "Commercial leadership is in place with genuine CS platform awareness, and a founding CSM is six months into building the function. The gap is a missing layer, not a person: there is no experienced CS operator between strategy and day-to-day execution. Augmenting with operator capacity lets the existing team build infrastructure at pace instead of triaging manually.",
      org:
        "CS org design is developing — a dedicated post-sales function exists and is actively being built. The gap is structure and process rather than headcount.",
    },
  },
];

export default PAMLICO_COMPANIES;

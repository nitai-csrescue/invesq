// ---------------------------------------------------------------------------
// Long Arc Capital portfolio — raw company inputs (public-signal Phase 1 data only)
// Internal-only tenant. Each company has one assessment — its initial diagnostic.
// Append new assessments to perform re-runs (see FIRM-ONBOARDING.md).
// ---------------------------------------------------------------------------
import type { RawCompany } from "./types";

const LONGARC_COMPANIES: RawCompany[] = [
  {
    id: "concertiv",
    name: "Concertiv",
    sector: "Procurement & Spend Management SaaS for Professional Services",
    hq: "New York, NY",
    employeesDisplay: "Unconfirmed",
    arrDisplay: "$5M–$10M",
    arrForRollup: [5_000_000, 10_000_000],
    confidence: "Medium",
    engagement:
      "Structured build — install health scoring and a formal account-planning cadence while the account base is still concentrated. 90-day engagement.",
    invesqSignal:
      "A high-touch, relationship-led model that has scaled on service quality — the diagnostic shows the systems layer (health signals, planning cadence) hasn't kept pace with the account footprint.",
    summary:
      "Concertiv's group-purchasing and spend-management model creates naturally sticky, multi-year client relationships across PE firms and professional-services clients. The CS motion is relationship-led and service-heavy — effective at current scale, but health scoring and structured account planning are absent, leaving renewals dependent on individual relationship strength rather than systematic coverage.",
    assessments: [
      {
        date: "2026-06-09",
        pillarScores: {
          org: 1,
          onboarding: 1,
          health: 0,
          escalation: null,
          revenue: 1,
          leadership: 1,
          planning: 0,
          ai: 1,
        },
      },
    ],
    gapNotes: {
      health:
        "No systematic health scoring — client risk surfaces through the service team's day-to-day contact, not data-driven signals, which caps coverage as the account count grows.",
      planning:
        "No structured success plans or QBR cadence on top accounts — renewal strength depends on relationship depth rather than a documented value narrative.",
      org: "Client success responsibilities blend into the service-delivery organization — a distinct CS mandate with commercial accountability hasn't been carved out.",
      onboarding:
        "Onboarding is thorough but bespoke per client — a repeatable activation path would shorten time-to-value on new logos.",
      revenue:
        "Expansion runs through the founders' and partners' networks — no structured CSQL motion or NRR ownership inside the client team.",
      ai: "Early AI use in spend analytics, but not yet applied to the client-coverage motion itself.",
    },
  },
  {
    id: "circleblack",
    name: "CircleBlack",
    sector: "Wealth Management Data & Portfolio Aggregation Platform",
    hq: "New York, NY",
    employeesDisplay: "Unconfirmed",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "Medium",
    engagement:
      "Foundational build — establish dedicated CS leadership and a health-signal baseline for the advisor base. 90–180 day engagement.",
    invesqSignal:
      "Platform stickiness is structural (advisor data flows through it daily), which masks retention risk — the diagnostic found no dedicated CS leadership layer and no systematic view of advisor health.",
    summary:
      "CircleBlack sits in the daily workflow of the advisors it serves — data aggregation creates real switching costs. But the customer function is support-led rather than success-led: there is no dedicated CS leadership, no health scoring across the advisor base, and no structured expansion motion. The platform's structural stickiness is doing the retention work that a CS function should own.",
    leadershipFraming: "establish",
    assessments: [
      {
        date: "2026-06-11",
        pillarScores: {
          org: 1,
          onboarding: 1,
          health: 0,
          escalation: 1,
          revenue: 0,
          leadership: 0,
          planning: 0,
          ai: null,
        },
      },
    ],
    gapNotes: {
      leadership:
        "No dedicated CS leadership role identified from public signals — customer coverage runs through support and product; establishing the function is the first move.",
      health:
        "No advisor-level health scoring — usage depth and data-connection breakage are the natural early-warning signals, and neither is systematically tracked today.",
      revenue:
        "No expansion accountability — seat and AUM-tier growth happens inbound, with no owned NRR motion.",
      planning:
        "No account-planning structure on enterprise/RIA relationships — the largest advisor groups get reactive, not proactive, coverage.",
      onboarding:
        "Advisor onboarding is functional but self-serve-heavy — activation depends on the advisor pushing through data-connection setup largely alone.",
      org: "Customer team is structured as support rather than success — reactive ticket resolution rather than owned outcomes.",
    },
  },
  {
    id: "tinubu",
    name: "Tinubu",
    sector: "Credit Insurance & Surety SaaS",
    hq: "Paris, France",
    employeesDisplay: "250",
    arrDisplay: "$30M–$40M",
    arrForRollup: [30_000_000, 40_000_000],
    confidence: "High",
    engagement:
      "Targeted optimization — formalize the expansion motion and extend health signals beyond implementation into steady-state usage. 60–90 day engagement.",
    invesqSignal:
      "A mature, enterprise-grade delivery organization with strong escalation discipline — the opportunity is commercial, not operational: expansion ownership and steady-state health visibility are the two levers left on the table.",
    summary:
      "Tinubu operates a mature enterprise SaaS motion serving credit insurers and surety carriers globally — long implementation cycles, deep domain expertise, and strong escalation management. The gaps are on the commercial side of the customer lifecycle: expansion is handled by sales without CS input, and health monitoring is implementation-centric, thinning out once accounts reach steady state.",
    assessments: [
      {
        date: "2026-06-12",
        pillarScores: {
          org: 2,
          onboarding: 1,
          health: 1,
          escalation: 2,
          revenue: 1,
          leadership: 2,
          planning: 1,
          ai: 0,
        },
      },
    ],
    gapNotes: {
      revenue:
        "Expansion is owned by sales with limited CS input — the account team closest to usage has no structured CSQL or NRR accountability.",
      health:
        "Health visibility is strong during implementation but thins out in steady state — long-tenured carrier accounts have the least systematic monitoring.",
      onboarding:
        "Enterprise implementations are well-managed but long — a phased value-realization framework would surface wins earlier in multi-quarter deployments.",
      planning:
        "Account planning exists on top accounts but isn't consistent across regions — EMEA and North America run different cadences.",
      ai: "No systematic AI in the CS motion — renewal-risk triage and usage-signal analysis across the carrier base are fully manual.",
    },
  },
];

export default LONGARC_COMPANIES;

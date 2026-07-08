// ---------------------------------------------------------------------------
// Solen Software Group portfolio — raw company inputs (public-signal Phase 1 data only)
// Internal-only tenant. Each company has one assessment — its initial diagnostic.
// Append new assessments to perform re-runs (see FIRM-ONBOARDING.md).
//
// Note: 5 of 6 companies scored all 8 pillars Insufficient Data (NA) — they
// tier as Tier 2 via the NA-substitution rule and carry no displayed composite.
// ---------------------------------------------------------------------------
import type { RawCompany } from "./types";

const SOLEN_COMPANIES: RawCompany[] = [
  {
    id: "trackstar",
    name: "Track Star",
    sector: "Fleet Management / GPS Telematics",
    hq: "Unconfirmed",
    employeesDisplay: "Unconfirmed",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "Medium",
    engagement:
      "Not yet outreach-ready on public signal alone; the ThingTech merger is a natural, timely conversation starter.",
    invesqSignal:
      "Composite: no pillars scored (8/8 Insufficient Data) — Tier 2, At Risk (via substitution). Confidence: Medium.",
    summary:
      "Track Star has been part of Solen's portfolio since 2022 and recently absorbed ThingTech, another Solen asset, into its GPS and telematics platform — a sign of active in-portfolio consolidation. Beyond that, the company's customer success motion isn't visible from public sources: only a single Capterra review exists, no customer success job postings surfaced, and no CS leader could be identified. For a company serving police departments and government agencies — relationships that typically run on long renewal cycles and high-touch account management — that's a meaningful blind spot, not a sign one way or the other about how the account motion is actually run.",
    calloutNote:
      "External Visibility: All eight pillars returned Insufficient Data. The ThingTech-into-Track Star consolidation is the most promising thread to pull — a direct conversation about how customer ownership was handled in that merge would likely surface more than further public research can.",
    assessments: [
      {
        date: "2026-07-08",
        pillarScores: {
          org: null,
          onboarding: null,
          health: null,
          escalation: null,
          revenue: null,
          leadership: null,
          planning: null,
          ai: null,
        },
      },
    ],
    gapNotes: {
      leadership:
        "No CS leader could be identified from public sources. Recommendation: Insufficient Data — the ThingTech consolidation is a natural moment to ask whether account ownership was defined during that merge.",
    },
  },
  {
    id: "viapeople",
    name: "ViaPeople",
    sector: "HR Performance Management SaaS",
    hq: "Unconfirmed",
    employeesDisplay: "Unconfirmed",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "Medium",
    engagement:
      "Light-touch discovery conversation to validate the Capterra signal and map who owns the SpiraLinks cross-sell motion.",
    invesqSignal:
      "Composite: no pillars scored (8/8 Insufficient Data) — Tier 2, At Risk (via substitution). Confidence: Medium.",
    summary:
      "ViaPeople carries a real, if thin, public track record: a 3.8-of-5 rating on Capterra across 5 reviews, with a standout 4.6 Customer Service sub-score and reviewer comments praising a knowledgeable, responsive account team. That's a genuinely positive signal, but it's below the review-volume threshold this diagnostic requires to score a pillar with confidence, and no named CS leader or job posting corroborates it. ViaPeople's merger with fellow Solen company SpiraLinks into a combined HR platform also created a real cross-sell motion at the portfolio level — worth understanding whether that's owned by a defined CS/AM function or handled ad hoc.",
    calloutNote:
      "External Visibility: All eight pillars returned Insufficient Data despite a promising underlying signal — the 4.6 Capterra Customer Service score (5 reviews) suggests a strong account team that simply isn't documented publicly. A direct conversation would likely confirm more than the review count alone can support.",
    assessments: [
      {
        date: "2026-07-08",
        pillarScores: {
          org: null,
          onboarding: null,
          health: null,
          escalation: null,
          revenue: null,
          leadership: null,
          planning: null,
          ai: null,
        },
      },
    ],
    gapNotes: {
      leadership:
        "No CS leader could be identified from public sources. Recommendation: Insufficient Data.",
    },
  },
  {
    id: "champsoftware",
    name: "Champ Software",
    sector: "EHR SaaS for Public Health Agencies",
    hq: "Unconfirmed",
    employeesDisplay: "21",
    arrDisplay: "$3M–$10M",
    arrForRollup: [3_000_000, 10_000_000],
    confidence: "Medium",
    engagement:
      "Discovery conversation to map how support and renewals are actually staffed today.",
    invesqSignal:
      "Composite: no pillars scored (8/8 Insufficient Data) — Tier 2, At Risk (via substitution). Confidence: Medium.",
    summary:
      "Champ Software has served public health agencies with its Nightingale Notes EHR for decades, with roughly 21 employees and an estimated $8M in revenue per third-party data. A customer testimonial specifically credits 'the support we have received from the team' as a reason for choosing the platform — a positive but informal signal. No CS-specific job postings, named leader, or review-platform presence were found to substantiate or score that signal further; at this size, customer support is likely handled by a small, generalist team rather than a dedicated CS function.",
    calloutNote:
      "External Visibility: All eight pillars returned Insufficient Data. At ~21 employees, CS is likely an informal, founder-adjacent function rather than a structured one — worth confirming directly rather than assuming either way.",
    assessments: [
      {
        date: "2026-07-08",
        pillarScores: {
          org: null,
          onboarding: null,
          health: null,
          escalation: null,
          revenue: null,
          leadership: null,
          planning: null,
          ai: null,
        },
      },
    ],
    gapNotes: {
      leadership:
        "No CS leader could be identified from public sources. Recommendation: Insufficient Data.",
    },
  },
  {
    id: "cairn",
    name: "Cairn Applications",
    sector: "Waste Hauling Operations SaaS",
    hq: "Unconfirmed",
    employeesDisplay: "5",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "Medium",
    engagement:
      "Direct conversation with the Customer Support Lead to understand how the function operates today at this scale, before scoping anything larger.",
    invesqSignal:
      "Composite 1/2 (7 pillars Insufficient Data) — Tier 2, At Risk (via substitution). Confidence: Medium.",
    summary:
      "Cairn Applications, acquired by Solen in December 2025, is a 5-person team supporting 350+ waste-hauling customers — and notably, one of those five roles is explicitly titled VP & Customer Support Lead, a real signal that customer support has a defined owner even at very small scale. Beyond that title, though, the public record goes quiet: no tenure or background could be confirmed for that role, and no reviews, job postings, or health-scoring signals exist to assess the rest of the motion. That's typical for a company this size, and it also means the fastest way to build a real diagnostic here is a direct conversation, not more open-web research.",
    assessments: [
      {
        date: "2026-07-08",
        pillarScores: {
          org: 1,
          onboarding: null,
          health: null,
          escalation: null,
          revenue: null,
          leadership: null,
          planning: null,
          ai: null,
        },
      },
    ],
    gapNotes: {
      org: "External Visibility: Seven of eight pillars returned Insufficient Data. The one concrete finding — a named, VP-titled Customer Support lead at a 5-person company — is worth building on directly rather than researching further from the outside.",
      leadership:
        "A named VP & Customer Support Lead (Angela Cucinelli-Moser) is titled distinctly at the leadership level, but tenure and background could not be confirmed publicly. Recommendation: Insufficient Data — worth a direct conversation rather than a structural conclusion.",
    },
  },
  {
    id: "smrtr",
    name: "SMRTR",
    sector: "Food & Beverage Compliance Automation SaaS",
    hq: "Remote (US)",
    employeesDisplay: "14",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "Medium",
    engagement:
      "Discovery conversation to understand how customer support and renewals are staffed across the remote team.",
    invesqSignal:
      "Composite: no pillars scored (8/8 Insufficient Data) — Tier 2, At Risk (via substitution). Confidence: Medium.",
    summary:
      "SMRTR runs a small (~14-person), fully remote team automating compliance and back-office workflows for food and beverage companies, with CEO Susanne Moore publicly crediting shared values and customer focus as the basis for the Solen partnership. Beyond that framing, no customer success job postings, named leader, or review-platform presence were found — consistent with a small, remote-first team where support is likely distributed across generalist roles rather than a dedicated function.",
    calloutNote:
      "External Visibility: All eight pillars returned Insufficient Data. A distributed, ~14-person remote team is unlikely to have much of a public CS footprint regardless of how well the function actually runs — this is a case where a direct conversation will tell you far more than further searching.",
    assessments: [
      {
        date: "2026-07-08",
        pillarScores: {
          org: null,
          onboarding: null,
          health: null,
          escalation: null,
          revenue: null,
          leadership: null,
          planning: null,
          ai: null,
        },
      },
    ],
    gapNotes: {
      leadership:
        "No CS leader could be identified from public sources. Recommendation: Insufficient Data.",
    },
  },
  {
    id: "primate",
    name: "Primate Technologies",
    sector: "Control Room Visualization Software",
    hq: "Unconfirmed",
    employeesDisplay: "11",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "Medium",
    engagement:
      "Discovery conversation to assess whether the Zoho Desk ticketing system could anchor a lightweight health-scoring or escalation process.",
    invesqSignal:
      "Composite: no pillars scored (8/8 Insufficient Data) — Tier 2, At Risk (via substitution). Confidence: Medium.",
    summary:
      "Primate Technologies joined Solen in 2024 and runs mission-critical control-room software for utilities and pipeline operators, with a public Help Center on Zoho Desk indicating at least a generalist ticketing system is in place. At roughly 11 employees, the company lists 'client services' as one of several blended functions alongside engineering, product, sales, and marketing — a structural signal that support exists but isn't broken out as its own discipline. No named CS leader, review-platform presence, or job postings were found to score any pillar further.",
    calloutNote:
      "External Visibility: All eight pillars returned Insufficient Data. 'Client services' is named as one blended function among several at this 11-person company — establishing it as a distinct discipline, even part-time, would be a natural first step.",
    assessments: [
      {
        date: "2026-07-08",
        pillarScores: {
          org: null,
          onboarding: null,
          health: null,
          escalation: null,
          revenue: null,
          leadership: null,
          planning: null,
          ai: null,
        },
      },
    ],
    gapNotes: {
      leadership:
        "No CS leader could be identified from public sources. Recommendation: Insufficient Data.",
    },
  },
];

export default SOLEN_COMPANIES;

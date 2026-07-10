// ---------------------------------------------------------------------------
// STG portfolio — raw company inputs (public-signal Phase 1 data only)
// Each company has one assessment — its initial diagnostic.
// Append new assessments to perform re-runs (see FIRM-ONBOARDING.md).
// ---------------------------------------------------------------------------
import type { RawCompany } from "../types";

const STG_COMPANIES: RawCompany[] = [
  {
    id: "nomis-solutions",
    name: "Nomis Solutions",
    sector: "AI-native pricing optimization, Financial Services SaaS",
    hq: "San Bruno, CA",
    employeesDisplay: "77",
    arrDisplay: "$20M–$30M",
    arrForRollup: [20_000_000, 30_000_000],
    confidence: "High",
    engagement:
      "Full CS function build — commercial motion, health scoring, and account planning all need to be established. 90–180 day engagement.",
    invesqSignal:
      "High-value, early-stage opportunity — the recent CCO hire (Jan 2026) and VP Strategic Account Management creation (Mar 2026) show STG is already investing here. A structured build now compounds that momentum.",
    summary:
      "Strong pricing-science IP and a sticky enterprise install base — the CS infrastructure to protect and grow that ARR is still being built. A structured CS function build now compounds the momentum already started with the CCO hire in January 2026.",
    assessments: [
      {
        date: "2026-06-04",
        pillarScores: {
          org: 1,
          onboarding: 0,
          health: 0,
          escalation: null,
          revenue: 0,
          leadership: 1,
          planning: 0,
          ai: 1,
        },
      },
    ],
    gapNotes: {
      revenue:
        "CS carries no expansion accountability — the commercial motion runs entirely through the pricing-science relationship, with no NRR ownership or CSQL motion.",
      health:
        "No systematic health scoring — risk is surfaced through reactive account conversations, not data-driven signals.",
      planning:
        "No structured success plans or QBR cadence — high-value accounts aren't getting the attention needed to drive expansion.",
      onboarding:
        "No repeatable onboarding motion — early time-to-value is inconsistent and activation is relationship-dependent.",
      leadership:
        "Amy Chase (CCO, Jan 2026) brings a strong operations and professional-services background — layering in SaaS-native CS frameworks is the near-term opportunity.",
      ai: "No systematic AI in the CS motion — signal triage and coverage scaling are fully manual.",
    },
  },
  {
    id: "cadmium",
    name: "Cadmium",
    sector: "Events / LMS / Content Management SaaS",
    hq: "Hunt Valley, MD",
    employeesDisplay: "Unconfirmed",
    arrDisplay: "$10M–$20M",
    arrForRollup: [10_000_000, 20_000_000],
    confidence: "High",
    engagement:
      "Structured build — formalize account planning and revenue motion, clarify CS reporting line. 90-day engagement.",
    invesqSignal:
      "Strong support sentiment to build on — the opportunity here is structural (reporting lines, planning cadence), not a trust or satisfaction problem.",
    summary:
      "Strong customer support and escalation management underpin genuine customer loyalty — the opportunity is structural rather than a satisfaction problem. Formalizing account planning, clarifying the CS reporting line, and activating an expansion motion are the highest-leverage moves.",
    assessments: [
      {
        date: "2026-06-10",
        pillarScores: {
          org: 1,
          onboarding: 1,
          health: null,
          escalation: 2,
          revenue: 1,
          leadership: 1,
          planning: 0,
          ai: 0,
        },
      },
    ],
    gapNotes: {
      planning:
        "No account-planning cadence — no QBR structure or success plans on high-value accounts, despite a clearly engaged CS team.",
      ai: "No systematic AI in the CS motion — coverage cannot scale without adding headcount.",
      org: "CS reports into operations rather than as a standalone GTM function — the reporting line limits mandate and commercial accountability.",
      revenue:
        "CS has no formal expansion ownership — upsell is relationship-driven with no structured CSQL or NRR accountability.",
      onboarding:
        "Onboarding is consistent but not yet systematized — time-to-value depends on individual CSM familiarity.",
      leadership:
        "Christina Rice (VP CS & Ops) brings strong operational depth — the opportunity is to add a SaaS-native commercial layer to the existing CS foundation.",
      escalation:
        "Escalation management is a clear strength — customer sentiment and review data show responsive, effective support.",
    },
  },
  {
    id: "confience",
    name: "Confience",
    sector: "Laboratory Information Management (LIMS) SaaS",
    hq: "Austin, TX",
    employeesDisplay: "Unconfirmed",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "Medium",
    engagement:
      "Structured build — formalize account planning and a unified commercial motion across the three merged entities. 90-day engagement.",
    invesqSignal:
      "Rapid M&A growth (3 acquisitions in under 2 years) has outpaced CS integration — a natural moment to unify retention practices across the combined customer base.",
    summary:
      "Rapid M&A growth across three acquisitions in under two years has built strong sector coverage but outpaced CS integration — retention practices, reporting structures, and commercial motions vary across the combined entity. Unifying those practices now is the highest-leverage move ahead of the next growth phase.",
    assessments: [
      {
        date: "2026-06-08",
        pillarScores: {
          org: 2,
          onboarding: 1,
          health: null,
          escalation: 1,
          revenue: null,
          leadership: 1,
          planning: 0,
          ai: 0,
        },
      },
    ],
    gapNotes: {
      planning:
        "No unified account-planning cadence across the three merged entities — success plans and QBR structures vary by legacy company.",
      ai: "No systematic AI in the CS motion across any of the three entities — a clear opportunity to establish a consistent capability.",
      revenue:
        "Revenue motion couldn't be fully assessed from public data — likely varies significantly across the three legacy businesses.",
      escalation:
        "Escalation practices vary across legacy entities — a unified playbook hasn't been established post-merger.",
      onboarding:
        "Onboarding processes differ by legacy entity — a unified activation path would reduce time-to-value variance.",
      leadership:
        "Camila Leal (Sr. Director CS) and Alex Andrade (EVP Global Customer Operations) bring complementary depth — aligning their scope across the merged entity is the key next step.",
      org: "CS org design is a clear strength — the most unified element across the merged entities.",
    },
  },
  {
    id: "mediavalet",
    name: "MediaValet",
    sector: "Digital Asset Management SaaS",
    hq: "Vancouver, BC",
    employeesDisplay: "102",
    arrDisplay: "$10M–$20M",
    arrForRollup: [10_000_000, 20_000_000],
    confidence: "High",
    engagement:
      "Targeted build — formalize account planning cadence, layer SaaS-native CS frameworks onto existing relationship strength. 60–90 day engagement.",
    invesqSignal:
      "Strong satisfaction and onboarding foundation already in place — this is optimization, not rebuild.",
    summary:
      "Strong foundation — high customer satisfaction, structured onboarding, clear role separation across the CS team. The opportunity: no formal account-planning cadence (QBRs, success plans) exists yet, and CS leadership brings deep client-relationship experience from outside core SaaS. Pairing that relationship strength with SaaS-native CS frameworks is the fastest path to the >100% NRR target set at acquisition.",
    assessments: [
      {
        date: "2026-06-12",
        pillarScores: {
          org: 2,
          onboarding: 2,
          health: null,
          escalation: 2,
          revenue: 1,
          leadership: 1,
          planning: 0,
          ai: 0,
        },
      },
    ],
    gapNotes: {
      planning:
        "Account Planning: No structured QBR or success-plan cadence yet, despite an active, well-reviewed CS team — a clear near-term build, not a rebuild.",
      ai: "No systematic AI in the CS motion — coverage at current ARR is manageable, but scaling without it will require proportional headcount adds.",
      leadership:
        "CS leadership has strong client-relationship experience from an agency/marketing background. Layering in SaaS-specific CS infrastructure — health scoring, structured QBRs — would help convert that relationship strength into measurable retention gains.",
      revenue:
        "Expansion motion is developing — CS sources some upsell informally but there is no structured CSQL process or NRR accountability.",
      onboarding:
        "Onboarding is a clear strength — review data consistently highlights fast time-to-value and responsive implementation support.",
      org: "CS org design is well-structured — clear role separation and a distinct CS team.",
      escalation:
        "Escalation management is a clear strength — review data highlights responsive support and effective issue resolution.",
    },
  },
  {
    id: "taxcalc",
    name: "TaxCalc",
    sector: "Tax Compliance / Practice Management SaaS (UK)",
    hq: "Aylesbury, UK",
    employeesDisplay: "100",
    arrDisplay: "Undisclosed",
    arrForRollup: null,
    confidence: "High",
    engagement:
      "Establish a unified CS function — first CS leadership hire, connecting existing Account Management and Support teams. 90–180 day engagement.",
    invesqSignal:
      "Minority growth investment where CS infrastructure doesn't exist yet — directly aligned with STG's stated 'invest in customer success' thesis at close. High-clarity, high-leverage starting point.",
    leadershipFraming: "establish",
    summary:
      "A minority growth investment where customer success hasn't yet been stood up as a unified function — retention is currently split between a commercial account-management team and a separate reactive support team, with no single owner connecting the two. Standing up a dedicated CS function is the single highest-leverage move available, and aligns directly with the investment thesis STG announced at close.",
    assessments: [
      {
        date: "2026-06-06",
        pillarScores: {
          org: 0,
          onboarding: 1,
          health: null,
          escalation: 1,
          revenue: 0,
          leadership: 0,
          planning: 0,
          ai: 0,
        },
      },
    ],
    gapNotes: {
      org: "CS Org Design: Retention responsibility is currently split across two teams with no unifying function — a first CS hire would close this gap directly.",
      leadership:
        "No dedicated CS leader is in place today. The opportunity isn't fixing an underperforming leader — it's that the role doesn't exist yet. A first CS leadership hire, unifying account management and support under one retention-accountable owner, is the clearest starting point.",
      revenue:
        "No expansion motion — the commercial team focuses on renewals and new logo; CS has no NRR ownership.",
      planning:
        "No account-planning cadence of any kind — renewals are calendar-driven, not success-plan-driven.",
      onboarding:
        "Onboarding runs through the commercial account-management team — no dedicated activation motion.",
      escalation: "Escalation routes through support SLAs — no CS-owned save motion.",
      ai: "No AI in any customer-facing or CS-adjacent workflow.",
    },
  },
];

export default STG_COMPANIES;

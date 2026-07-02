// ---------------------------------------------------------------------------
// Raviga Capital portfolio — FULLY FICTIONAL demo dataset (Silicon Valley
// parody universe). Internal sales demo only — no real company data.
// 10 portfolio companies, each with 12 monthly assessments (Jul 2025 – Jun 2026).
// ---------------------------------------------------------------------------
import type { RawCompany } from "./types";

// Monthly assessment dates: the 15th of each month, Jul 2025 → Jun 2026
const M = [
  "2025-07-15", // M1
  "2025-08-15", // M2
  "2025-09-15", // M3
  "2025-10-15", // M4
  "2025-11-15", // M5
  "2025-12-15", // M6
  "2026-01-15", // M7
  "2026-02-15", // M8
  "2026-03-15", // M9
  "2026-04-15", // M10
  "2026-05-15", // M11
  "2026-06-15", // M12
];

// Helper to build an assessment entry
function a(
  date: string,
  org: 0 | 1 | 2,
  onboarding: 0 | 1 | 2,
  health: 0 | 1 | 2,
  escalation: 0 | 1 | 2 | null,
  revenue: 0 | 1 | 2,
  leadership: 0 | 1 | 2,
  planning: 0 | 1 | 2,
  ai: 0 | 1 | 2 | null,
) {
  return {
    date,
    pillarScores: { org, onboarding, health, escalation, revenue, leadership, planning, ai },
  };
}

const RAVIGA_COMPANIES: RawCompany[] = [
  // -------------------------------------------------------------------------
  // 1. Pied Piper — Data Compression / Infrastructure
  //    Arc: ~2(T1)→~4(T1)→~6(T2)→~8(T2)→~10(T3)
  //    Actions: M4 hired HoCS, M9 formal onboarding process
  // -------------------------------------------------------------------------
  {
    id: "pied-piper",
    name: "Pied Piper",
    sector: "Data Compression / Infrastructure",
    hq: "Palo Alto, CA",
    employeesDisplay: "45",
    arrDisplay: "$8M–$12M",
    arrForRollup: [8_000_000, 12_000_000],
    confidence: "Medium",
    engagement:
      "Leadership infrastructure build — install systematic onboarding for API partners and establish a formal CS function as the team scales past $10M ARR. 90-day engagement.",
    invesqSignal:
      "First dedicated CS hire at month four triggered measurable improvements — the function is maturing but still running on founder relationships and tribal knowledge.",
    summary:
      "A data compression API platform with genuine enterprise traction — 45-person team, $8M–$12M ARR, and an unusually deep technical moat. The CS function arrived late: the first Head of Customer Success joined at month four, inheriting a book of business managed entirely through engineering-led relationships. Month nine's formal onboarding rollout for API partners marked the first process milestone, but account planning and AI-assisted workflows remain underdeveloped. The inflection from Tier 1 to Tier 3 over twelve months is real — the question is whether the next hire lands before churn signals emerge in the long tail.",
    actionsLog: [
      { date: "2025-10-15", label: "Hired first Head of Customer Success" },
      { date: "2026-03-15", label: "Implemented formal onboarding process for new API partners" },
    ],
    assessments: [
      a(M[0],  0, 0, 1, 0, 0, 0, 1, 0), // composite=2  T1
      a(M[1],  0, 0, 1, 0, 0, 1, 1, 0), // composite=3  T1
      a(M[2],  0, 0, 1, 0, 1, 1, 1, 0), // composite=4  T1 ← M3 checkpoint
      a(M[3],  1, 0, 1, 0, 1, 1, 1, 0), // composite=5  T2 ← M4 action: HoCS hired
      a(M[4],  1, 0, 1, 0, 1, 1, 1, 0), // composite=5  T2
      a(M[5],  1, 1, 1, 0, 1, 1, 1, 0), // composite=6  T2 ← M6 checkpoint
      a(M[6],  1, 1, 1, 1, 1, 1, 1, 0), // composite=7  T2
      a(M[7],  1, 1, 1, 1, 1, 1, 1, 0), // composite=7  T2
      a(M[8],  1, 2, 1, 1, 1, 1, 1, 0), // composite=8  T2 ← M9 checkpoint + action: onboarding
      a(M[9],  1, 2, 1, 1, 1, 1, 1, 1), // composite=9  T3
      a(M[10], 1, 2, 1, 1, 1, 1, 2, 1), // composite=10 T3
      a(M[11], 1, 2, 1, 1, 1, 1, 2, 1), // composite=10 T3 ← M12 checkpoint
    ],
    gapNotes: {
      org: "CS org coalesced around engineering relationships — function is maturing but role definitions remain blurry between support and CSM.",
      health: "Health scoring is manual and owner-dependent — no systematic signal aggregation exists at the API partner level.",
      planning: "No structured account planning cadence — API partner success plans are verbal, not documented, and owned by individual engineers.",
      ai: "No AI tooling in the CS motion — partner coverage relies on direct engineering contact rather than automated signal monitoring.",
      escalation: "Escalation protocols are informal — at-risk API partners surface through usage drop alerts rather than a documented save playbook.",
    },
  },

  // -------------------------------------------------------------------------
  // 2. Hooli — Enterprise Cloud / AI Conglomerate
  //    Arc: ~12(T3)→~11(T3)→~9(T2)→~9(T2)→~7(T2) declining
  //    Actions: M3 Nucleus launch diverts CS, M8 third reorg
  // -------------------------------------------------------------------------
  {
    id: "hooli",
    name: "Hooli",
    sector: "Enterprise Cloud / AI",
    hq: "Santa Clara, CA",
    employeesDisplay: "4,200",
    arrDisplay: "$150M+",
    arrForRollup: [150_000_000, 200_000_000],
    confidence: "High",
    engagement:
      "Triage and stabilization — assess CS org resilience after three reorgs and a major product diversion, then rebuild the account-planning and health-scoring infrastructure that eroded during the Nucleus launch year. 90-day engagement.",
    invesqSignal:
      "A high-baseline CS program in structural decay — three reorgs and a flagship product launch consumed the operational bandwidth that once kept Hooli in Tier 3. The trajectory is recoverable but needs intervention.",
    summary:
      "Hooli entered the observation year with one of the most mature CS programs in the portfolio — a purpose-built platform, formal QBR cadence, and commercial ownership of expansion. Then the Nucleus launch happened. CS resources were redirected to support enterprise onboarding of a product that wasn't ready, the org was reorganized three times in eleven months, and by year-end the composite had eroded from Tier 3 to Tier 2. The leadership layer remains strong; the execution infrastructure has been hollowed out. Hooli is a stabilization story, not a build-from-scratch story.",
    actionsLog: [
      { date: "2025-09-15", label: "Nucleus product launch diverted CS resources" },
      { date: "2026-02-15", label: "Third reorg of the fiscal year" },
    ],
    assessments: [
      a(M[0],  2, 2, 1, 1, 2, 2, 1, 1), // composite=12 T3
      a(M[1],  2, 2, 1, 1, 2, 2, 1, 1), // composite=12 T3
      a(M[2],  2, 2, 1, 1, 1, 2, 1, 1), // composite=11 T3 ← M3 checkpoint + action: Nucleus launch
      a(M[3],  1, 2, 1, 1, 1, 2, 1, 1), // composite=10 T3
      a(M[4],  1, 1, 1, 1, 1, 2, 1, 1), // composite=9  T2
      a(M[5],  1, 1, 1, 1, 1, 2, 1, 1), // composite=9  T2 ← M6 checkpoint
      a(M[6],  1, 1, 1, 1, 1, 2, 1, 1), // composite=9  T2
      a(M[7],  1, 1, 1, 1, 1, 2, 1, 1), // composite=9  T2 ← M8 action: third reorg
      a(M[8],  1, 1, 1, 1, 1, 2, 1, 1), // composite=9  T2 ← M9 checkpoint
      a(M[9],  1, 1, 0, 1, 1, 2, 1, 1), // composite=8  T2
      a(M[10], 0, 1, 0, 1, 1, 2, 1, 1), // composite=7  T2
      a(M[11], 0, 1, 0, 1, 1, 2, 1, 1), // composite=7  T2 ← M12 checkpoint
    ],
    gapNotes: {
      org: "Three reorgs in twelve months have produced role ambiguity and unclear CS mandate boundaries — reporting lines have changed faster than documented processes.",
      health: "Health scoring infrastructure exists on paper but has not been updated since the Nucleus launch diversion — the dashboard is stale by at least two quarters.",
      planning: "QBR cadence has slipped — fewer than half of enterprise accounts received a scheduled review during the Nucleus launch year.",
    },
  },

  // -------------------------------------------------------------------------
  // 3. Aviato — Events / Consumer App
  //    Arc: flat ~3 (T1) all year, ai=null all year
  //    No actions logged
  // -------------------------------------------------------------------------
  {
    id: "aviato",
    name: "Aviato",
    sector: "Events / Consumer Social",
    hq: "San Francisco, CA",
    employeesDisplay: "12",
    arrDisplay: "$2M–$4M",
    arrForRollup: [2_000_000, 4_000_000],
    confidence: "Low",
    engagement:
      "Pilot assessment — limited Phase 1 data available given early-stage revenue and minimal external signals. Monitoring for ARR milestone as trigger for formal engagement.",
    invesqSignal:
      "Early-stage consumer app with no active CS motion — ARR and headcount are below the minimum engagement threshold, but the events vertical warrants monitoring.",
    summary:
      "Aviato is the portfolio's earliest-stage company: a consumer-facing events and social coordination app with twelve staff, sub-$4M ARR, and a CS function that exists in name only. AI Adoption Maturity is marked Insufficient Data — the team has no active development roadmap for CS tooling. The business is generating revenue through founder-led relationships, which is appropriate at this scale. The INVESQ view is that Aviato is a watch-list holding rather than an active engagement candidate until ARR crosses $5M or headcount doubles.",
    assessments: [
      a(M[0],  0, 1, 0, 1, 0, 1, 0, null), // composite=3 T1 (ai=null, displayMax=14)
      a(M[1],  0, 1, 0, 1, 0, 1, 0, null),
      a(M[2],  0, 1, 0, 1, 0, 1, 0, null),
      a(M[3],  0, 1, 0, 1, 0, 1, 0, null),
      a(M[4],  0, 1, 0, 1, 0, 1, 0, null),
      a(M[5],  0, 1, 0, 1, 0, 1, 0, null),
      a(M[6],  0, 1, 0, 1, 0, 1, 0, null),
      a(M[7],  0, 1, 0, 1, 0, 1, 0, null),
      a(M[8],  0, 1, 0, 1, 0, 1, 0, null),
      a(M[9],  0, 1, 0, 1, 0, 1, 0, null),
      a(M[10], 0, 1, 0, 1, 0, 1, 0, null),
      a(M[11], 0, 1, 0, 1, 0, 1, 0, null), // all same
    ],
    gapNotes: {
      onboarding: "No structured onboarding — new users are activated through direct founder contact, not a repeatable process.",
      health: "No systematic health signals — customer status is managed through informal check-ins and app usage spot-checks.",
      revenue: "Revenue motion is entirely reactive — no documented expansion playbook or commercial ownership of NRR.",
      ai: "No active CS tooling roadmap — AI adoption is not applicable at the current team size and revenue stage.",
    },
  },

  // -------------------------------------------------------------------------
  // 4. Bachmanity — Venture Studio / Incubator
  //    Arc: ~7(T2)→spike ~9(T2) at M5→crash ~4(T1) at M7→recovery ~6(T2) M12
  //    Actions: M5 Bachmanity Insanity conference, M6 staff released
  // -------------------------------------------------------------------------
  {
    id: "bachmanity",
    name: "Bachmanity",
    sector: "Venture Studio / Incubator",
    hq: "San Francisco, CA",
    employeesDisplay: "30",
    arrDisplay: "$5M–$9M",
    arrForRollup: [5_000_000, 9_000_000],
    confidence: "Medium",
    engagement:
      "Post-spike stabilization — reconstruct the CS infrastructure that was temporarily inflated by conference staffing, then install a durable account planning and escalation framework. 60-day engagement.",
    invesqSignal:
      "The Bachmanity Insanity conference created a synthetic Tier 2 reading that obscured the underlying Tier 1 reality — composite recovered to Tier 2 organically by year-end, but through founder heroics rather than systems.",
    summary:
      "Bachmanity is a venture studio with a recurring event strategy that briefly looked like a scalable CS motion. The May conference surge — driven by contract staff and elevated client attention — pushed the composite to Tier 2 for exactly one month before the team contracted back to its core two-person operation. Months seven and eight were genuinely rough: escalation handling disappeared, planning cadence collapsed, and the composite fell to four. The recovery to six by December reflects founder-level commitment rather than durable process. The infrastructure gap is real and clearly defined.",
    actionsLog: [
      { date: "2025-11-15", label: "Hosted 'Bachmanity Insanity' launch conference — temporary CS staffing surge" },
      { date: "2025-12-15", label: "Conference contract staff released, no permanent process retained" },
    ],
    assessments: [
      a(M[0],  1, 1, 1, 1, 1, 1, 1, 0), // composite=7  T2
      a(M[1],  1, 1, 1, 1, 1, 1, 1, 0), // composite=7  T2
      a(M[2],  1, 1, 1, 1, 1, 1, 1, 0), // composite=7  T2 ← M3 checkpoint
      a(M[3],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[4],  1, 2, 1, 1, 1, 1, 1, 1), // composite=9  T2 ← M5 spike + action
      a(M[5],  1, 1, 1, 1, 1, 1, 0, 1), // composite=7  T2 ← M6 action: staff released
      a(M[6],  0, 0, 1, 0, 1, 1, 1, 0), // composite=4  T1 ← M7 crash
      a(M[7],  0, 0, 1, 0, 1, 1, 1, 0), // composite=4  T1
      a(M[8],  1, 0, 1, 0, 1, 1, 1, 0), // composite=5  T2 ← M9 checkpoint (recovering)
      a(M[9],  1, 1, 1, 0, 1, 1, 1, 0), // composite=6  T2
      a(M[10], 1, 1, 1, 0, 1, 1, 1, 0), // composite=6  T2
      a(M[11], 1, 1, 1, 0, 1, 1, 1, 0), // composite=6  T2 ← M12 checkpoint
    ],
    gapNotes: {
      escalation:
        "Escalation framework collapsed post-conference when contract staff departed — no documented escalation path currently exists beyond direct founder contact.",
      planning:
        "Account planning cadence was created for the conference period and not maintained — portfolio company success plans are verbal and unscheduled.",
      ai: "No AI tooling in the CS motion — all client coverage is manual and owner-dependent.",
    },
  },

  // -------------------------------------------------------------------------
  // 5. Endframe — Video Compression Rival
  //    Arc: ~8(T2) M1–M6 → drops to ~4(T1) at M7 → ~3(T1) M12
  //    Action: M7 majority of team departed in acquihire
  // -------------------------------------------------------------------------
  {
    id: "endframe",
    name: "Endframe",
    sector: "Video Compression",
    hq: "San Jose, CA",
    employeesDisplay: "4 (post-acquihire)",
    arrDisplay: "~$6M",
    arrForRollup: [5_500_000, 6_500_000],
    confidence: "Medium",
    engagement:
      "Monitoring only — post-acquihire team of four retains nominal CS coverage; active engagement not recommended until ownership and roadmap are clarified.",
    invesqSignal:
      "The January acquihire removed the majority of Endframe's CS capacity in a single week — a four-person rump operation now covers a customer base built for a twenty-person team.",
    summary:
      "Endframe spent the first half of the year as a credible Tier 2 video compression platform — all eight CS pillars scoring consistently, a functioning escalation motion, and a small but professional team of twenty. Month seven changed everything: a major acquihire agreement dissolved the engineering and CS organization, leaving four employees to cover customer obligations built for twenty. The composite dropped from eight to three within two months and has not recovered. The revenue motion is the only remaining bright spot in a structurally compromised operation.",
    actionsLog: [
      { date: "2026-01-15", label: "Majority of engineering and CS team departed in acquihire" },
    ],
    assessments: [
      a(M[0],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[1],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[2],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2 ← M3 checkpoint
      a(M[3],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[4],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[5],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2 ← M6 checkpoint
      a(M[6],  0, 1, 0, 0, 1, 0, 1, 1), // composite=4  T1 ← M7 acquihire
      a(M[7],  0, 0, 0, 0, 1, 0, 1, 1), // composite=3  T1
      a(M[8],  0, 0, 0, 0, 1, 0, 1, 1), // composite=3  T1 ← M9 checkpoint
      a(M[9],  0, 0, 0, 0, 1, 0, 1, 1), // composite=3  T1
      a(M[10], 0, 0, 0, 0, 1, 0, 1, 1), // composite=3  T1
      a(M[11], 0, 0, 0, 0, 1, 0, 1, 1), // composite=3  T1 ← M12 checkpoint
    ],
    gapNotes: {
      org: "Post-acquihire, the CS org consists of one remaining generalist covering the full account base — structural capacity is critically below minimum.",
      health: "Health scoring has been inactive since the team departure — at-risk accounts are invisible and likely churning silently.",
      escalation: "Escalation framework is non-functional — the team member responsible for the save playbook departed in the acquihire.",
      leadership: "CS leadership departed in the acquihire — the remaining team reports to a part-time operations contact with no CS mandate.",
    },
  },

  // -------------------------------------------------------------------------
  // 6. Intersite — College Social Network
  //    Arc: flat ~2 (T1) all year
  //    No actions logged
  // -------------------------------------------------------------------------
  {
    id: "intersite",
    name: "Intersite",
    sector: "Consumer Social (College)",
    hq: "Berkeley, CA",
    employeesDisplay: "3",
    arrDisplay: "~$1M",
    arrForRollup: [800_000, 1_200_000],
    confidence: "Low",
    engagement:
      "Light-touch observation — college-network niche with minimal B2B CS applicability. No engagement recommended at current scale.",
    invesqSignal:
      "Three-person consumer social network with no CS infrastructure and sub-$1.2M ARR — monitoring for pivot signals that would introduce enterprise support requirements.",
    summary:
      "Intersite is a niche college social network that has not materially grown its user base or revenue during the observation period. At three employees and under $1.2M ARR, there is no CS function, no health scoring, and no account planning — nor would there be an ROI case for building one at current scale. The composite has been flat at two all year. INVESQ's recommendation is monitoring-only; the primary thesis risk is a consumer pivot requiring enterprise sales support the team cannot currently deliver.",
    assessments: [
      a(M[0],  0, 0, 1, 0, 0, 1, 0, 0), // composite=2  T1
      a(M[1],  0, 0, 1, 0, 0, 1, 0, 0),
      a(M[2],  0, 0, 1, 0, 0, 1, 0, 0),
      a(M[3],  0, 0, 1, 0, 0, 1, 0, 0),
      a(M[4],  0, 1, 1, 0, 0, 1, 0, 0), // composite=3 (slight natural variation)
      a(M[5],  0, 0, 1, 0, 0, 1, 0, 0),
      a(M[6],  0, 0, 1, 0, 0, 1, 0, 0),
      a(M[7],  0, 0, 1, 0, 0, 1, 0, 0),
      a(M[8],  0, 0, 1, 0, 0, 1, 0, 0),
      a(M[9],  0, 1, 1, 0, 0, 1, 0, 0), // composite=3 (slight variation)
      a(M[10], 0, 0, 1, 0, 0, 1, 0, 0),
      a(M[11], 0, 0, 1, 0, 0, 1, 0, 0), // composite=2
    ],
    gapNotes: {
      org: "No formal CS function — customer contact routes directly to the founder with no process layer.",
      revenue: "No expansion motion or commercial accountability — revenue is entirely subscription-driven with no upsell framework.",
      planning: "No account planning at any level — engagement is entirely reactive and owner-dependent.",
    },
  },

  // -------------------------------------------------------------------------
  // 7. SeeFood — Food Recognition Consumer AI
  //    Arc: ~3(T1) dip at M2 → recovers → ~7(T2) M9 → ~9(T2) M12
  //    Actions: M2 App Store spike, M6 first support hire
  // -------------------------------------------------------------------------
  {
    id: "seefood",
    name: "SeeFood",
    sector: "Consumer AI / Food Recognition",
    hq: "San Francisco, CA",
    employeesDisplay: "15",
    arrDisplay: "$3M–$5M",
    arrForRollup: [3_000_000, 5_000_000],
    confidence: "Medium",
    engagement:
      "Scale-readiness build — standing up first formal support infrastructure, health scoring, and escalation protocols ahead of another potential viral growth moment. 60-day engagement.",
    invesqSignal:
      "The App Store spike at month two exposed a structural gap that was partially remediated by month six — SeeFood is on a genuine upward trajectory, and the next viral moment will land on better infrastructure.",
    summary:
      "SeeFood began the year as a consumer AI food-recognition app with no support infrastructure. An App Store feature in August 2025 produced a 40x sign-up spike and a brief composite dip — onboarding and escalation collapsed under the volume. The team responded faster than most: a part-time support hire in December created the nucleus of a formal CS function. By the end of the year the composite had reached nine, placing SeeFood at the top of Tier 2. The risk is the next viral moment; the opportunity is to build the infrastructure between spikes rather than after them.",
    actionsLog: [
      { date: "2025-08-15", label: "Featured on App Store — 40x signup spike, no support infrastructure" },
      { date: "2025-12-15", label: "Hired first dedicated support hire (part-time)" },
    ],
    assessments: [
      a(M[0],  0, 1, 0, 0, 0, 1, 1, 0), // composite=3  T1
      a(M[1],  0, 0, 0, 0, 0, 1, 1, 0), // composite=2  T1 ← M2 dip (App Store spike)
      a(M[2],  0, 1, 0, 0, 0, 1, 1, 0), // composite=3  T1
      a(M[3],  0, 1, 1, 0, 0, 1, 1, 0), // composite=4  T1
      a(M[4],  1, 1, 1, 0, 0, 1, 1, 0), // composite=5  T1
      a(M[5],  1, 1, 1, 0, 0, 1, 1, 0), // composite=5  T1 ← M6 action: support hire
      a(M[6],  1, 1, 1, 0, 0, 1, 1, 1), // composite=6  T2
      a(M[7],  1, 1, 1, 0, 1, 1, 1, 0), // composite=6  T2
      a(M[8],  1, 1, 1, 1, 1, 1, 1, 0), // composite=7  T2 ← M9 checkpoint
      a(M[9],  1, 1, 1, 1, 1, 1, 1, 0), // composite=7  T2
      a(M[10], 1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[11], 1, 2, 1, 1, 1, 1, 1, 1), // composite=9  T2 ← M12 checkpoint
    ],
    gapNotes: {
      onboarding: "Onboarding infrastructure collapsed during the App Store spike — now partially rebuilt with the part-time hire, but not yet documented or repeatable.",
      escalation: "Escalation protocols emerged reactively during the growth event and are not yet formalized — at-risk users surface through app store reviews rather than a proactive signal.",
      health: "No health scoring platform — customer status is managed through manual app analytics review rather than a systematic signal layer.",
    },
  },

  // -------------------------------------------------------------------------
  // 8. Homicide — Anonymous Social App
  //    Arc: ~8(T2) → crisis dip ~5(T1) at M5 → recovers ~8(T2) M12
  //    Actions: M5 content moderation failure, M9 T&S function
  // -------------------------------------------------------------------------
  {
    id: "homicide",
    name: "Homicide",
    sector: "Anonymous Social",
    hq: "Los Angeles, CA",
    employeesDisplay: "60",
    arrDisplay: "$10M–$15M",
    arrForRollup: [10_000_000, 15_000_000],
    confidence: "High",
    engagement:
      "Trust & Safety infrastructure reinforcement and crisis-recovery audit — formalize the escalation and health-scoring improvements made in response to the moderation incident. 60-day engagement.",
    invesqSignal:
      "A well-run anonymous social platform that proved it could respond quickly to a major CS crisis — the Trust & Safety function stood up in month nine is a structural improvement, not a band-aid.",
    summary:
      "Homicide is an anonymous social platform with a content moderation incident at month five that produced a press-driven churn spike and a composite drop to Tier 1. The response was faster than the initial drop: within four months, the team stood up a dedicated Trust & Safety function, rebuilt the escalation framework, and recovered to Tier 2. The year ends at the same composite as it started — eight — but on a structurally more resilient foundation. The key risk is that the moderation infrastructure is still new and under-tested at scale.",
    actionsLog: [
      { date: "2025-11-15", label: "Content moderation failure triggered press coverage and churn spike" },
      { date: "2026-03-15", label: "Stood up dedicated Trust & Safety function" },
    ],
    assessments: [
      a(M[0],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[1],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[2],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2 ← M3 checkpoint
      a(M[3],  1, 1, 1, 0, 1, 1, 1, 0), // composite=6  T2 (declining)
      a(M[4],  1, 0, 1, 0, 1, 1, 1, 0), // composite=5  T1 ← M5 crisis
      a(M[5],  0, 0, 1, 0, 1, 1, 1, 1), // composite=5  T1
      a(M[6],  0, 1, 1, 0, 1, 1, 1, 1), // composite=6  T2 (recovering)
      a(M[7],  1, 1, 1, 0, 1, 1, 1, 1), // composite=7  T2
      a(M[8],  1, 1, 1, 1, 1, 1, 1, 0), // composite=7  T2 ← M9 checkpoint + T&S action
      a(M[9],  1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[10], 1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2
      a(M[11], 1, 1, 1, 1, 1, 1, 1, 1), // composite=8  T2 ← M12 checkpoint
    ],
    gapNotes: {
      escalation: "Escalation framework is newly rebuilt post-incident — processes are documented but not yet battle-tested at scale or under a second crisis.",
      health: "Health scoring is reactive — the Trust & Safety function addresses known cases but lacks a proactive signal layer to surface at-risk users early.",
      planning: "Account planning remains informal — structured QBR or success plan processes are not yet in place for enterprise advertising clients.",
    },
  },

  // -------------------------------------------------------------------------
  // 9. Nucleus Labs — Enterprise Cloud Storage
  //    Arc: steady climb ~10(T3) → ~13(T4) by M12
  //    Action: M10 promoted CS lead to VP
  // -------------------------------------------------------------------------
  {
    id: "nucleus-labs",
    name: "Nucleus Labs",
    sector: "Enterprise Cloud Storage",
    hq: "Menlo Park, CA",
    employeesDisplay: "80",
    arrDisplay: "$18M–$22M",
    arrForRollup: [18_000_000, 22_000_000],
    confidence: "High",
    engagement:
      "Optimization and VP onboarding support — with a newly-promoted VP of CS in seat, the focus shifts from infrastructure build to capacity planning, weighted composite refinement, and Phase 2 data integration. 45-day engagement.",
    invesqSignal:
      "Nucleus is the portfolio's highest-performing CS operation — a steady climb from Tier 3 to Tier 4 driven by systematic health scoring, proactive account planning, and a CS leadership hire that earned the promotion at month ten.",
    summary:
      "Nucleus Labs entered the observation period as the strongest CS organization in the portfolio and spent the year proving it was not a fluke. The team moved methodically from Tier 3 at month one to Tier 4 by month ten — driven by health scoring maturation, structured account planning cadences, and a revenue motion that genuinely owns NRR accountability. The internal CS lead's promotion to VP in April reflected operational readiness, not tenure. At $20M ARR and 80 headcount, Nucleus Labs is the reference case for what a Raviga portfolio company looks like when CS infrastructure is treated as a first-class investment.",
    actionsLog: [
      { date: "2026-04-15", label: "Promoted internal CS lead to VP of Customer Success" },
    ],
    assessments: [
      a(M[0],  1, 1, 1, 1, 1, 1, 2, 2), // composite=10 T3
      a(M[1],  1, 1, 1, 1, 1, 1, 2, 2), // composite=10 T3
      a(M[2],  1, 2, 1, 1, 1, 1, 2, 2), // composite=11 T3 ← M3 checkpoint
      a(M[3],  1, 2, 1, 1, 1, 1, 2, 2), // composite=11 T3
      a(M[4],  1, 2, 1, 1, 2, 1, 2, 2), // composite=12 T3
      a(M[5],  1, 2, 1, 1, 2, 1, 2, 2), // composite=12 T3 ← M6 checkpoint
      a(M[6],  1, 2, 1, 1, 2, 1, 2, 2), // composite=12 T3
      a(M[7],  1, 2, 1, 1, 2, 1, 2, 2), // composite=12 T3
      a(M[8],  1, 2, 1, 1, 2, 1, 2, 2), // composite=12 T3 ← M9 checkpoint
      a(M[9],  1, 2, 1, 1, 2, 2, 2, 2), // composite=13 T4 ← M10 action: VP promotion
      a(M[10], 1, 2, 1, 1, 2, 2, 2, 2), // composite=13 T4
      a(M[11], 1, 2, 1, 1, 2, 2, 2, 2), // composite=13 T4 ← M12 checkpoint
    ],
    gapNotes: {
      health: "Health scoring is well-established for enterprise accounts but not yet extended to the SMB tier — a coverage gap that grows as the SMB cohort scales.",
      revenue: "Expansion motion is strong at the enterprise tier; SMB expansion quotas are not yet formally assigned — an NRR ceiling risk as the SMB book grows.",
    },
  },

  // -------------------------------------------------------------------------
  // 10. RussHub — IoT / Smart-Home Platform
  //     Arc: flat ~4 (T1) all year DESPITE ARR growing ~35%
  //     Expansion-without-retention-infrastructure risk callout
  //     Action: M3 large ad-spend campaign, no CS investment
  // -------------------------------------------------------------------------
  {
    id: "russhub",
    name: "RussHub",
    sector: "IoT / Smart Home",
    hq: "Oakland, CA",
    employeesDisplay: "25",
    arrDisplay: "$4M–$7M",
    arrForRollup: [4_000_000, 7_000_000],
    confidence: "Medium",
    engagement:
      "Retention infrastructure build — the ARR growth has not been matched by any CS investment; install health scoring and structured account planning before the first major renewal cycle arrives. 90-day engagement.",
    invesqSignal:
      "ARR grew approximately 35% over the observation period while the CS composite held flat at four — a classic expansion-without-retention-infrastructure pattern that typically precedes a churn spike at the first renewal cycle.",
    summary:
      "RussHub is an IoT and smart-home platform with impressive commercial momentum: ARR grew roughly 35% over the observation period, driven by a September ad-spend campaign that generated a large volume of new accounts. The CS infrastructure to retain those accounts, however, was not built alongside the acquisition motion. The composite has been flat at four all year — no health scoring, no structured account planning, no escalation protocols beyond founder relationships. The renewal cycle on the new cohort is twelve to eighteen months out. If the retention infrastructure is not built before those renewals arrive, the ARR growth will reverse.",
    calloutNote: "ARR grew ~35% while CS composite held flat at Tier 1 — expansion without retention infrastructure.",
    actionsLog: [
      { date: "2025-09-15", label: "Large ad-spend marketing campaign — no CS investment alongside" },
    ],
    assessments: [
      a(M[0],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1
      a(M[1],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1
      a(M[2],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1 ← M3 checkpoint
      a(M[3],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1
      a(M[4],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1
      a(M[5],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1 ← M6 checkpoint
      a(M[6],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1
      a(M[7],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1
      a(M[8],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1 ← M9 checkpoint
      a(M[9],  0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1
      a(M[10], 0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1
      a(M[11], 0, 1, 0, 1, 0, 1, 1, 0), // composite=4  T1 ← M12 checkpoint
    ],
    gapNotes: {
      health: "No health scoring platform — customer health is invisible as the account base grows from the marketing campaign. The renewal cliff is twelve to eighteen months out.",
      planning: "No structured account planning — the new cohort from the marketing campaign has no assigned success plans or defined success milestones.",
      escalation: "Escalation protocols are informal — at-risk accounts surface through support tickets rather than proactive signals, by which point churn is often imminent.",
      org: "CS function is founder-led with no dedicated post-sales headcount — not sustainable at the current growth rate and incoming renewal volume.",
    },
  },
];

export default RAVIGA_COMPANIES;

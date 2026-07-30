// Fixed, non-per-company copy blocks used verbatim on every report. The
// spec explicitly calls these out as a "fixed list... reuse the same N
// every time", not Claude-generated per company. Wording below is authored
// to match the spec's short topic phrases (earlier at-risk identification,
// consistency across regions, health/renewal visibility, expansion/cross-
// sell execution, leadership accountability) — the topics are spec-given,
// the full sentences are authored here since no verbatim copy was supplied.

export const VALUE_CREATION_BULLETS: string[] = [
  "Earlier at-risk identification: surfacing churn signals weeks before renewal conversations begin, instead of learning about risk from the customer.",
  "Consistency across regions and teams: the same health, escalation, and renewal playbook applied everywhere, not tribal knowledge held by individual reps.",
  "Health and renewal visibility: a single, trustworthy view of account health and renewal risk that leadership and the board can act on, not a patchwork of spreadsheets.",
  "Expansion and cross-sell execution: a repeatable motion for identifying and acting on expansion signal, rather than upsell left to chance or tenure.",
  "Leadership accountability via standardized metrics: a common scorecard that ties CS performance to retention and expansion outcomes leadership is already accountable for.",
];

// Fixed initiative → expected-outcome pairs for the Page 6 roadmap table.
export const INITIATIVES: Array<{ initiative: string; outcome: string }> = [
  {
    initiative: "Health Scoring",
    outcome: "A unified, signal-driven health score replacing gut-feel account status, giving leadership a leading indicator of churn risk.",
  },
  {
    initiative: "Escalation Framework",
    outcome: "A defined escalation path with clear ownership and SLAs, cutting time-to-resolution on at-risk accounts.",
  },
  {
    initiative: "Revenue Motion",
    outcome: "A structured expansion and renewal motion embedded in the CS workflow, converting more usage signal into realized revenue.",
  },
  {
    initiative: "Account Planning",
    outcome: "Standardized account plans across the book of business, reducing key-person risk and improving handoff continuity.",
  },
  {
    initiative: "CS Leadership Function",
    outcome: "A CS leadership mandate with board-level visibility, aligning the function's authority with its retention/expansion impact.",
  },
  {
    initiative: "AI Adoption Maturity",
    outcome: "AI-assisted workflows for signal detection and account triage, increasing coverage without proportionally increasing headcount.",
  },
];

export const METHODOLOGY_PARAGRAPH =
  "This diagnostic is built entirely from public, verifiable signals: company websites, job postings, product and pricing pages, and other publicly observable operational evidence. It does not rely on internal data access, customer interviews, or vendor-provided metrics. Eight underlying diagnostic signals are collected against a fixed rubric and rolled up into four rubric pillars (Org Design, Onboarding, Health Scoring, and Renewal & Expansion), each rated Low, Medium, or High, or Insufficient Data where public signal is too thin to rate responsibly. The company-level PortCo Score is the numeric composite of the four pillar ratings (Low = 0, Medium = 1, High = 2, with Insufficient Data counted as 1 point), banded 0-2 Low, 3-5 Medium, 6-8 High, so results are comparable across companies and over time.";

// PDF-EXPORT EXCEPTION (Nitai sign-off, 2026-07-30): the client-facing
// diagnostic PDF carries the CS RESCUE brand, matching the handmade PDFs.
// Portal/web UI chrome still says INVESQ (the INVESQ-branding rule remains in
// force everywhere else). No email is included: no established public contact
// address exists in this app, and fabricating one would be worse than omitting.
export const PREPARED_BY = {
  name: "Nitai Vinitzky",
  org: "CS Rescue",
};

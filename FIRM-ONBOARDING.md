# FIRM ONBOARDING — Adding a New PE Firm Tenant

Adding a new PE firm to INVESQ Portfolio Intelligence is a **pure data operation**.
No UI code, routing, or component changes are required.

---

## Overview

Each tenant is a PE firm. The system contains:

| File | Purpose |
|---|---|
| `artifacts/cs-rescue/src/data/portfolio/firms.ts` | Registry of all firms |
| `artifacts/cs-rescue/src/data/portfolio/<firmSlug>.ts` | Raw company data for each firm |
| `artifacts/cs-rescue/src/data/portfolio/engine.ts` | Wire new firm → raw data here |

The engine pre-computes all derived values (composites, tiers, gaps, rollups, assessment points) at module load time and validates every record. A violation throws at startup rather than silently rendering wrong numbers.

---

## Step 1 — Add the firm to the registry

Edit **`artifacts/cs-rescue/src/data/portfolio/firms.ts`** and append a `Firm` object:

```typescript
{
  slug: "acme-capital",          // URL-safe identifier; must be unique; becomes the URL prefix
  displayName: "Acme Capital",   // shown in header, footer, "Prepared for" lines
  statusLabel: "Design-partner preview",  // shown in the header status pill
  internalOnly: false,           // true → rose "Internal — not cleared for external distribution" pill shown
}
```

`statusLabel` options:
- `"Design-partner preview"` — public-facing demo
- `"Internal preview — not cleared for external distribution"` — internal only (set `internalOnly: true`)

---

## Step 2 — Create the company data file

Create **`artifacts/cs-rescue/src/data/portfolio/<firmSlug>.ts`** (e.g. `acme-capital.ts`).

Each company has an `assessments` array. Start with one entry — the initial diagnostic. Append new entries over time to build the trend (see **Re-running a Diagnostic** below).

```typescript
import type { RawCompany } from "./types";

const ACME_COMPANIES: RawCompany[] = [
  {
    // --- Identity ---
    id: "company-slug",              // URL-safe, lowercase, hyphens; must be unique within this firm
    name: "Company Name",
    sector: "Industry / Product Category",
    hq: "City, State",              // or "City, Country" for international

    // --- Size (never fabricate point figures) ---
    employeesDisplay: "150",         // or "Unconfirmed" if not publicly available
    arrDisplay: "$10M–$20M",         // or "Undisclosed" if not publicly available
    arrForRollup: [10_000_000, 20_000_000],  // null if arrDisplay is "Undisclosed"

    // --- Metadata ---
    confidence: "High",              // "High" or "Medium" — based on signal breadth

    // --- Copy blocks (verbatim from diagnostic) ---
    summary: "Executive summary paragraph...",
    engagement: "Recommended engagement rec. Duration.",
    invesqSignal: "INVESQ signal paragraph...",

    // --- Leadership framing (optional) ---
    // Only set this when NO CS leader exists yet (role has never been filled).
    // This changes "CS Leadership" gap label to "Establish CS Leadership".
    // leadershipFraming: "establish",

    // --- Assessment history ---
    // Start with one entry. Append new entries as re-runs are performed.
    // MUST be sorted ascending by date. Engine validates this.
    // The LATEST entry determines the current composite, tier, gaps, and rollups.
    assessments: [
      {
        date: "2026-06-15",          // ISO date string (YYYY-MM-DD)
        pillarScores: {
          // All 8 pillars required. Values: 0, 1, 2, or null.
          // 0 = Infrastructure Gap (not present)
          // 1 = Developing / Partial (present but incomplete)
          // 2 = Optimized (fully in place)
          // null = Insufficient Data (cannot be assessed from public signals; marked NA)
          org: 1,          // CS Org Design         ×1.00
          onboarding: 2,   // Onboarding            ×1.25
          health: 0,       // Health Scoring        ×1.50  ← highest weight
          escalation: 1,   // Escalation & Churn    ×1.25
          revenue: 0,      // Revenue Motion        ×1.50  ← highest weight
          leadership: 1,   // CS Leadership         ×1.25
          planning: 0,     // Account Planning      ×1.00
          ai: null,        // AI Adoption Maturity  ×1.00 — NA if insufficient public signal
        },
        // note: "Optional narrative about this diagnostic run.",
      },
    ],

    // --- Company-specific gap notes (optional, keyed by pillar id) ---
    // Overrides the generic pillar.gapNote for that specific company.
    // Only include pillars where you have company-specific language.
    // Pillar ids: "org" | "onboarding" | "health" | "escalation" | "revenue" | "leadership" | "planning" | "ai"
    gapNotes: {
      health: "Specific health-scoring gap note for this company...",
      revenue: "Specific revenue-motion gap note for this company...",
      leadership: "Named leader context, specific to this company...",
    },
  },
];

export default ACME_COMPANIES;
```

### Score conventions

| Score | Meaning | Signals |
|---|---|---|
| `2` | Optimized | Dedicated role/tool clearly in place, positive signal data |
| `1` | Developing / Partial | Partially present; inconsistent; some evidence |
| `0` | Infrastructure Gap | No evidence; clearly absent |
| `null` | Insufficient Data (NA) | Cannot be assessed from available public signals |

**NA pillars are excluded from the displayed composite** (denominator shrinks by 2 per NA) but count as `1` for **tier assignment only** (substitution rule). Never guess — use `null`.

### ARR conventions

| Situation | `arrDisplay` | `arrForRollup` |
|---|---|---|
| Range disclosed publicly | `"$10M–$20M"` | `[10_000_000, 20_000_000]` |
| Point estimate disclosed | `"~$15M"` | `[13_000_000, 17_000_000]` (use a range) |
| Not disclosed | `"Undisclosed"` | `null` |

Never fabricate a point figure. Undisclosed companies are excluded from Total ARR and Est. ARR at Risk rollups and shown in a footnote.

---

## Step 3 — Wire the data into the engine

Edit **`artifacts/cs-rescue/src/data/portfolio/engine.ts`**.

Add the import at the top:
```typescript
import ACME_COMPANIES from "./acme-capital";
```

Add the entry to `RAW_COMPANIES_BY_FIRM`:
```typescript
const RAW_COMPANIES_BY_FIRM: Readonly<Record<string, RawCompany[]>> = {
  stg: STG_COMPANIES,
  pamlico: PAMLICO_COMPANIES,
  "acme-capital": ACME_COMPANIES,  // ← add this line
};
```

---

## Step 4 — Verify

Run the typecheck to confirm no type errors:
```bash
pnpm --filter @workspace/cs-rescue run typecheck
```

Start the dev server and open:
- **`/acme-capital/portfolio`** — dashboard with KPIs, portfolio trend, tier distribution, company grid
- **`/acme-capital/portfolio/<company-slug>`** — company detail with pillar breakdown, gaps, trend chart
- **`/acme-capital/portfolio/<company-slug>/report`** — diagnostic report

The tenant index at **`/firms`** lists all active tenants with company counts.

---

## Re-running a Diagnostic (adding a new assessment)

When INVESQ performs a follow-up diagnostic on a portfolio company, append a new entry to that company's `assessments` array. **No UI, routing, or component changes are required** — all trend data is driven purely from this array.

### The single rule: append in ascending date order

```typescript
assessments: [
  {
    date: "2026-06-15",     // ← initial diagnostic (oldest)
    pillarScores: { org: 1, onboarding: 2, health: 0, escalation: 1, revenue: 0, leadership: 1, planning: 0, ai: null },
  },
  {
    date: "2026-09-22",     // ← re-run (most recent) — THIS entry now drives the dashboard
    pillarScores: { org: 1, onboarding: 2, health: 1, escalation: 1, revenue: 1, leadership: 1, planning: 0, ai: null },
    note: "Health scoring platform piloted — scores are improving.",
  },
],
```

### What changes automatically after a re-run

| Surface | How it updates |
|---|---|
| Dashboard composite, tier, gaps | Derived from **latest** assessment |
| Company detail header (last assessed date) | Latest assessment `date` |
| Composite trend chart (company page) | One solid dot per assessment; dashed projection hides once 3+ real points exist |
| Portfolio trend widget (dashboard) | Avg normalized composite per calendar month — new period appears automatically |
| Est. ARR at risk | Re-derived from latest tier |

### Projection behavior

The trend chart shows a dashed **illustrative projection** extending 2 quarters ahead whenever a company has fewer than 3 real assessments. Once a company has 3+ assessments the projection disappears entirely — the real data speaks for itself. The portfolio trend widget follows the same rule across all companies in aggregate.

### What does NOT change

- `gapNotes` — company-level narrative overrides stay at the top level; they are not per-assessment. Update them alongside the re-run when the narrative changes.
- `engagement` / `invesqSignal` / `summary` — update these copy fields manually when the re-run produces a new recommendation.

---

## Validation (automatic)

The engine validates every firm's data at module load time. If any rule is violated, the app throws at startup with a clear error message rather than silently rendering wrong numbers.

Checked automatically:
- `assessments` array has at least one entry
- Assessments are sorted ascending by date
- Every assessment has all 8 pillar IDs present with valid scores (`0`, `1`, `2`, or `null`)
- `displayMax` = 16 − 2 × (count of NA pillars in the latest assessment)
- `tierComposite` = sum of scores substituting `1` for each NA
- Tier ID derived from tier-composite bands: 0–5 → Tier 1, 6–9 → Tier 2, 10–12 → Tier 3, 13–16 → Tier 4
- `arrForRollup` is either `null` or a `[lo, hi]` range with `lo ≤ hi` and both non-negative

---

## Derived values (never store, always compute)

The engine derives all of these from raw inputs automatically:

| Derived value | Formula |
|---|---|
| `scores` | `latest assessment.pillarScores` |
| `lastDiagnostic` | `latest assessment.date` |
| `composite` | Sum of scored (non-NA) pillar scores from latest assessment |
| `displayMax` | `16 − 2 × naCount` |
| `tierComposite` | Sum of all pillar scores, substituting `1` for each NA |
| `tier` | Band lookup: 0–5 T1, 6–9 T2, 10–12 T3, 13–16 T4 |
| `weightedComposite` | Sum of `score × pillar.weight` for scored pillars |
| `weightedMax` | Sum of `2 × pillar.weight` for scored pillars |
| `gaps` | Pillars with score < 2 (excluding NA), sorted by `(2 − score) × weight` desc |
| `arrAtRiskRange` | `arrForRollup × tier.riskMidpoint` (null when ARR undisclosed) |
| `assessmentPoints` | One point per assessment: `normalizedComposite = (composite / displayMax) × 16` |
| `portfolioTrendPoints` | Avg `normalizedComposite` across companies, grouped by calendar month |

---

## Worked example — Acme Capital

**Firm record (`firms.ts`):**
```typescript
{ slug: "acme-capital", displayName: "Acme Capital", statusLabel: "Design-partner preview", internalOnly: false }
```

**Company "Vertex Software" — initial diagnostic:**
```typescript
assessments: [
  {
    date: "2026-06-15",
    pillarScores: { org: 2, onboarding: 1, health: 0, escalation: 2, revenue: 0, leadership: 1, planning: 0, ai: null },
  },
]
```

**Derived values (engine computes from latest assessment):**
- NA pillars: `ai` → naCount = 1
- `composite` = 2+1+0+2+0+1+0 = **6**
- `displayMax` = 16 − 2×1 = **14**
- `tierComposite` = 2+1+0+2+0+1+0+1 = **7** (ai NA → 1)
- `tier` = **Tier 2** (7 falls in 6–9 band, "Targeted Opportunities")
- `weightedComposite` = 2×1.0 + 1×1.25 + 0×1.5 + 2×1.25 + 0×1.5 + 1×1.25 + 0×1.0 = **7.75**
- `weightedMax` = (1.0+1.25+1.5+1.25+1.5+1.25+1.0)×2 = **17.5** (ai excluded)
- `arrAtRiskRange` = [10M×0.15, 20M×0.15] = **[$1.5M, $3M]**
- `normalizedComposite` = (6 / 14) × 16 = **6.9** (on the 0–16 scale)
- Top gap: Health Scoring (weakness = 2×1.5 = 3.0, highest)

**Trend chart behavior:** 1 real data point → solid dot at Jun '26 + 2 dashed illustrative projection dots. Projection disappears after 3 real assessments.

---

## Route structure (automatic once registered)

| URL | Page |
|---|---|
| `/<firmSlug>/portfolio` | Dashboard — KPIs, portfolio trend, tier distribution, company grid |
| `/<firmSlug>/portfolio/<companySlug>` | Company detail — pillar breakdown, gaps, trend chart |
| `/<firmSlug>/portfolio/<companySlug>/report` | Diagnostic report — printable PDF-ready |
| `/firms` | Internal tenant index (unlinked, no firm cross-visibility) |

Legacy `/portfolio/*` routes redirect to `/stg/portfolio/*` automatically.
Unknown `firmSlug` values render a clean 404.

// ---------------------------------------------------------------------------
// STG Journey Map — Admin Lens internal look-and-feel test (NOT client-facing).
//
// Route: /stg/portfolio/:companyId/journey — STG ONLY. Any other firm slug
// redirects back to that firm's company page.
//
// Gating (two independent layers, both required):
//   1. Tenant login gate — inherited automatically: App.tsx wraps the whole
//      <Switch> in <PortfolioGate>, whose FIRM_SCOPED_RE matches every
//      /:firmSlug/portfolio descendant, so anonymous /stg visitors hit the
//      same magic-link login screen as every other /stg/portfolio* route.
//   2. Admin Lens — same pattern as AdminBarMount: useAuth() and render
//      ZERO journey markup unless the session is an authenticated admin.
//      Non-admin (tenant-authenticated) visitors are redirected to the
//      company page. This route is not linked from any public STG nav.
//
// MVP data rule: exactly ONE real pin — the company's CURRENT stored rubric
// v2 pillar bands + PortCo composite pulled live from bootstrap (DB-backed,
// never hardcoded). The other 4 phases are honest empty states. No curve or
// dashed projection is drawn — that would imply data that doesn't exist.
// Acquisition year is NOT shown (real acquisition dates for all 5 STG
// companies are still unsourced — do not guess).
//
// Copy policy: no GRR/NRR, no employee-sentiment content, no personal
// judgments of named individuals, forward-looking structural framing only.
// Evidence callouts render ONLY real data already in the payload:
// actionsLog entries (SOURCE: Actions Log) and curated calloutNote /
// top-gap notes (SOURCE: Manual). No PDL / Revelio callouts are rendered
// because no per-company PDL/Revelio evidence records exist in the payload
// yet — never fabricate a source tag.
// ---------------------------------------------------------------------------
import { Redirect, useParams, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { computePortcoComposite } from "@workspace/portfolio-engine";
import { ArrowLeft, MapPin, CircleDashed } from "lucide-react";
import { TenantShell } from "@/components/portfolio/TenantShell";
import {
  getFirm,
  getFirmCompany,
  formatDate,
  monthsSince,
  RUBRIC_PILLARS,
  rubricBandMeta,
  type Company,
} from "@/data/portfolio";

// Lifecycle phases (x-axis), per the approved Journey Map concept snapshot.
const PHASES = [
  { id: "acquisition", label: "Acquisition", sub: "(year unconfirmed)" },
  { id: "onboarding", label: "Onboarding / Stabilization", sub: "" },
  { id: "growth", label: "Growth / Optimization", sub: "" },
  { id: "renewal", label: "Renewal & Expansion", sub: "" },
  { id: "exit", label: "Exit-Readiness", sub: "" },
] as const;

type PhaseId = (typeof PHASES)[number]["id"];

// Which phase is "closest to today" for the single current-state pin.
// Heuristic on time since investment (when a date exists in the data):
// under 12 months -> Onboarding/Stabilization, 12-36 months ->
// Growth/Optimization, beyond -> Renewal & Expansion. Never Acquisition
// (the diagnostic is current-state, not deal-time) and never Exit-Readiness
// (no exit evidence exists). Missing investment date -> Growth/Optimization,
// flagged as an assumption in the pin footnote.
function currentPhase(company: Company): { phase: PhaseId; assumed: boolean } {
  if (!company.investmentDate || isNaN(Date.parse(company.investmentDate))) {
    return { phase: "growth", assumed: true };
  }
  const months = monthsSince(company.investmentDate);
  if (months < 12) return { phase: "onboarding", assumed: false };
  if (months <= 36) return { phase: "growth", assumed: false };
  return { phase: "renewal", assumed: false };
}

const SWIMLANE_LABELS: Record<string, string> = {
  renewalExpansionScore: "Renewal & Expansion Forecasting",
};

function EmptyNode() {
  return (
    <div className="flex h-full min-h-[64px] flex-col items-center justify-center gap-1 px-1 text-center">
      <CircleDashed className="h-4 w-4 text-slate-600" />
      <span className="text-[9px] leading-tight text-slate-500">
        No diagnostic recorded at this phase yet.
      </span>
    </div>
  );
}

export default function StgJourneyMap() {
  const params = useParams<{ firmSlug: string; companyId: string }>();
  const firmSlug = params?.firmSlug ?? "";
  const companyId = params?.companyId ?? "";
  const { isAuthenticated, isLoading } = useAuth();

  // STG-only sandbox: every other tenant bounces straight back.
  if (firmSlug !== "stg") {
    return <Redirect to={`/${firmSlug}/portfolio${companyId ? `/${companyId}` : ""}`} />;
  }

  // Admin Lens gate: zero journey markup unless an authenticated admin
  // session exists (same detection as AdminBarMount / TenantAdminBar).
  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Redirect to={`/stg/portfolio/${companyId}`} />;
  }

  const firm = getFirm(firmSlug);
  const company = firm ? getFirmCompany(firmSlug, companyId) : undefined;
  if (!firm || !company) {
    return <Redirect to="/stg/portfolio" />;
  }

  const bandMeta = rubricBandMeta(company.rubric.portcoScore);
  // Numeric 0-8 composite via the shared engine (never re-implement bucketing).
  const composite = computePortcoComposite(RUBRIC_PILLARS.map((p) => company.rubric[p.key]));
  const { phase: pinPhase, assumed: phaseAssumed } = currentPhase(company);

  // Evidence callouts — real payload data only, each with its real source.
  const callouts: { source: "Manual" | "Actions Log"; text: string }[] = [];
  if (company.calloutNote) callouts.push({ source: "Manual", text: company.calloutNote });
  if (company.topGap?.note) callouts.push({ source: "Manual", text: company.topGap.note });
  for (const entry of (company.actionsLog ?? []).slice(-3)) {
    callouts.push({ source: "Actions Log", text: `${formatDate(entry.date)} — ${entry.label}` });
  }

  return (
    <TenantShell firm={firm}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6" data-testid="journey-map">
        {/* Header */}
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Link
            href={`/stg/portfolio/${company.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            data-testid="link-back-company"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {company.name}
          </Link>
          <span className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
            Admin Lens preview — internal look &amp; feel test, not client-facing
          </span>
        </div>
        <h1 className="text-lg font-semibold text-foreground">
          Journey Map — Acquisition to Exit
        </h1>
        <p className="mb-4 max-w-3xl text-xs text-muted-foreground">
          One diagnostic exists for {company.name} (assessed {formatDate(company.lastDiagnostic)}
          ), rendered as the single current-state pin below. Earlier and later phases show as
          unrecorded until additional diagnostics are run — no trajectory is projected.
        </p>

        {/* Current-state summary strip */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <MapPin className="h-4 w-4" style={{ color: bandMeta.color }} />
          <div className="text-xs text-muted-foreground">Current state</div>
          <span
            className={`rounded border px-2 py-0.5 text-xs font-semibold ${bandMeta.badgeClass}`}
            data-testid="badge-portco-score"
          >
            PortCo Score · {company.rubric.portcoScore} · {composite}/8
          </span>
          <span className="text-[10px] text-muted-foreground">
            Bands: Low 0–2 · Medium 3–5 · High 6–8
          </span>
          <span className="text-[10px] text-muted-foreground">
            Assessed {formatDate(company.lastDiagnostic)}
          </span>
        </div>

        {/* Grid: phase header row + 4 pillar swimlanes */}
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <div className="min-w-[720px]">
            {/* Phase header */}
            <div className="grid grid-cols-[160px_repeat(5,1fr)] border-b border-border">
              <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Pillar
              </div>
              {PHASES.map((ph) => (
                <div
                  key={ph.id}
                  className={`border-l border-border px-2 py-2 text-center ${
                    ph.id === pinPhase ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="text-[11px] font-medium text-foreground">{ph.label}</div>
                  {ph.sub && <div className="text-[9px] text-muted-foreground">{ph.sub}</div>}
                  {ph.id === pinPhase && (
                    <div className="mt-0.5 text-[9px] font-medium text-primary">
                      Current state{phaseAssumed ? " *" : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Swimlanes */}
            {RUBRIC_PILLARS.map((pillar) => {
              const value = company.rubric[pillar.key];
              const meta = rubricBandMeta(value);
              return (
                <div
                  key={pillar.key}
                  className="grid grid-cols-[160px_repeat(5,1fr)] border-b border-border last:border-b-0"
                  data-testid={`lane-${pillar.key}`}
                >
                  <div className="flex items-center px-3 py-2 text-xs font-medium text-foreground">
                    {SWIMLANE_LABELS[pillar.key] ?? pillar.name}
                  </div>
                  {PHASES.map((ph) =>
                    ph.id === pinPhase ? (
                      <div
                        key={ph.id}
                        className="flex min-h-[64px] flex-col items-center justify-center gap-1 border-l border-border bg-primary/5 px-1 py-2"
                      >
                        <span
                          className="h-3 w-3 rounded-full ring-2 ring-offset-1 ring-offset-card"
                          style={{ backgroundColor: meta.color, ["--tw-ring-color" as string]: meta.color }}
                        />
                        <span className={`text-[10px] font-semibold ${meta.textClass}`}>
                          {meta.label}
                        </span>
                      </div>
                    ) : (
                      <div key={ph.id} className="border-l border-border">
                        <EmptyNode />
                      </div>
                    ),
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {phaseAssumed && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            * Phase placement assumed (no sourced investment date); the diagnostic itself is
            current-state as of {formatDate(company.lastDiagnostic)}.
          </p>
        )}

        {/* Evidence callouts — real sources only */}
        {callouts.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              Evidence at the current state
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {callouts.map((c, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card px-3 py-2"
                  data-testid={`callout-${i}`}
                >
                  <span className="mb-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    Source · {c.source}
                  </span>
                  <p className="text-xs leading-relaxed text-foreground">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TenantShell>
  );
}

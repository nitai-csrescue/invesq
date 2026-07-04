import { Link, useRoute } from "wouter";
import { ArrowLeft, AlertTriangle, FileText, Info, TrendingDown } from "lucide-react";
import { PortfolioLayout, ConfidenceBadge } from "@/components/portfolio/PortfolioLayout";
import { RavigaShell } from "@/components/portfolio/RavigaShell";
import {
  AS_OF_DATE,
  PILLARS,
  PILLAR_MAX,
  WEIGHTED_MAX,
  formatDate,
  gapTitle,
  getFirm,
  getFirmCompany,
  scoreLevel,
  type Firm,
} from "@/data/portfolio";

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function FirmNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="text-6xl font-bold text-muted-foreground/30">404</div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Firm not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">No portfolio exists for this firm identifier.</p>
      </div>
    </div>
  );
}

export default function PortfolioReport() {
  const [, params] = useRoute("/:firmSlug/portfolio/:companyId/report");
  const firmSlug = params?.firmSlug ?? "";
  const firm = getFirm(firmSlug);

  if (!firm) return <FirmNotFound />;

  const Shell = (firmSlug === "raviga" ? RavigaShell : PortfolioLayout) as typeof PortfolioLayout;

  const company = params?.companyId ? getFirmCompany(firmSlug, params.companyId) : undefined;

  if (!company) {
    return (
      <Shell firm={firm}>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-lg font-semibold text-foreground">Report not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No diagnostic report exists for this company id.
          </p>
          <Link
            href={`/${firm.slug}/portfolio`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to portfolio
          </Link>
        </div>
      </Shell>
    );
  }

  const { tier } = company;

  return (
    <Shell firm={firm}>
      <Link
        href={`/${firm.slug}/portfolio/${company.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> {company.name}
      </Link>

      {/* Report masthead */}
      <div className="mt-4 rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary">
              <FileText className="h-3.5 w-3.5" /> Sample Diagnostic Report · Operational Due Diligence
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {company.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {company.sector} · {company.hq}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tier.badgeClass}`}
              >
                Tier {tier.id} · {tier.label}
              </span>
              <ConfidenceBadge confidence={company.confidence} />
            </div>
          </div>
          <div className="text-left lg:text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phase 1 composite</div>
            <div className="font-mono text-5xl font-bold leading-none" style={{ color: tier.color }}>
              {company.composite}
              <span className="text-lg text-muted-foreground"> / {company.displayMax}</span>
            </div>
            {company.insufficientCount > 0 && (
              <p className="mt-1.5 text-[11px] text-amber-300/80">
                {company.insufficientCount}{" "}
                {company.insufficientCount === 1 ? "pillar" : "pillars"} marked Insufficient Data — excluded from
                the composite, reducing the max from {PILLAR_MAX} to {company.displayMax}.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-3 lg:grid-cols-6">
          <MetaItem label="Prepared for" value={firm.displayName} />
          <MetaItem label="Assessment date" value={formatDate(company.lastDiagnostic)} />
          <MetaItem label="ARR" value={company.arrDisplay} />
          <MetaItem label="Headcount" value={company.employeesDisplay} />
          <MetaItem label="Est. ARR at risk" value={company.arrAtRiskDisplay} />
          <MetaItem label="Framework" value={`8 pillars · 0–${PILLAR_MAX}`} />
        </div>
      </div>

      {/* Executive summary */}
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Executive summary</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{company.summary}</p>
        <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">INVESQ signal</div>
          <p className="mt-1 text-sm text-foreground">{company.invesqSignal}</p>
        </div>
      </div>

      {/* Pillar scorecard */}
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-foreground">8-pillar scorecard</h2>
          <span className="text-xs text-muted-foreground">
            Each pillar scored 0–2 · Phase 1 unweighted · weights apply in Phase 2
          </span>
        </div>
        <div className="mt-4 divide-y divide-border">
          {PILLARS.map((p) => {
            const score = company.scores[p.id];
            const lvl = scoreLevel(score);
            const fill = score === null ? 0 : (score / 2) * 100;
            return (
              <div
                key={p.id}
                className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      ×{p.weight.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.measures}</p>
                </div>
                <div className="flex items-center gap-3 sm:w-56 sm:justify-end">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full rounded-full ${lvl.barClass} ${score === null ? "opacity-40" : ""}`}
                      style={{ width: `${score === null ? 100 : fill}%` }}
                    />
                  </div>
                  <span className={`w-28 text-right font-mono text-xs font-medium ${lvl.textClass}`}>
                    {score === null ? "N/A" : `${score} / 2`} · {lvl.short}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phase 1 · unweighted</div>
            <div className="font-mono text-lg font-semibold text-foreground">
              {company.composite} <span className="text-xs text-muted-foreground">/ {company.displayMax}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phase 2 · weighted</div>
            <div className="font-mono text-lg font-semibold text-foreground">
              {company.weightedComposite}{" "}
              <span className="text-xs text-muted-foreground">/ {company.weightedMax}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Full-framework max</div>
            <div className="font-mono text-lg font-semibold text-foreground">
              {PILLAR_MAX} <span className="text-xs text-muted-foreground">/ {WEIGHTED_MAX} weighted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority findings */}
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <TrendingDown className="h-4 w-4 text-rose-400" /> Priority findings
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ranked by weighted gap severity — (2 − score) × pillar weight
        </p>
        <div className="mt-4 space-y-3">
          {company.gaps.slice(0, 4).map((g, i) => (
            <div key={g.pillar.id} className="flex gap-3 rounded-lg border border-border bg-background/40 p-4">
              <div className="font-mono text-sm font-semibold text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-foreground">{gapTitle(company, g)}</span>
                  <span className={`text-[11px] font-medium ${scoreLevel(g.score).textClass}`}>
                    {scoreLevel(g.score).label}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.note}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground/70">PE value link: {g.pillar.peValue}</p>
              </div>
            </div>
          ))}
          {company.gaps.length === 0 && (
            <p className="text-xs text-muted-foreground">No material gaps — all pillars are optimized.</p>
          )}
        </div>
      </div>

      {/* Recommended engagement */}
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Recommended engagement</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{company.engagement}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {company.arrAtRiskRange ? (
            <>
              Tier {tier.id} companies typically carry {tier.arrRisk.toLowerCase()} — for {company.name}, an
              estimated {company.arrAtRiskDisplay} of {company.arrDisplay} ARR.
            </>
          ) : (
            <>
              Tier {tier.id} companies typically carry {tier.arrRisk.toLowerCase()}. {company.name}&apos;s ARR is
              undisclosed, so no dollar estimate is shown.
            </>
          )}
        </p>
      </div>

      {/* Methodology & disclaimers */}
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Info className="h-4 w-4 text-muted-foreground" /> Methodology
        </h2>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
          <li>
            Phase 1 scores each of the 8 pillars 0–2 using external public signals only (LinkedIn, job descriptions,
            G2/Capterra, company content) — unweighted composite out of {PILLAR_MAX}.
          </li>
          <li>
            Phase 2 applies pillar weights (max {WEIGHTED_MAX}) once proprietary data is available post-engagement.
          </li>
          <li>
            Pillars that cannot be assessed from public data are marked Insufficient Data and excluded from the
            composite — never estimated.
          </li>
        </ul>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Illustrative design-partner preview. Scores, findings, and ARR-at-risk estimates are sample data for
            demonstration purposes.
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Prepared for {firm.displayName} by INVESQ · as of {formatDate(AS_OF_DATE)} · Design-partner preview
      </p>
    </Shell>
  );
}

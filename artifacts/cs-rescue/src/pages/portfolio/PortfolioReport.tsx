import { Link, useRoute } from "wouter";
import { ArrowLeft, FileText, Info, TrendingDown } from "lucide-react";
import { ConfidenceBadge } from "@/components/portfolio/ConfidenceBadge";
import { TenantShell } from "@/components/portfolio/TenantShell";
import { PillarScorecard } from "@/components/portfolio/PillarScorecard";
import { TenantExportButton } from "@/components/portfolio/TenantExportButton";
import {
  AS_OF_DATE,
  RUBRIC_PILLARS,
  formatDate,
  gapTitle,
  getFirm,
  getFirmCompany,
  rubricBandMeta,
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

  const company = params?.companyId ? getFirmCompany(firmSlug, params.companyId) : undefined;

  if (!company) {
    return (
      <TenantShell firm={firm}>
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
      </TenantShell>
    );
  }

  const { tier } = company;
  const bandMeta = rubricBandMeta(company.rubric.portcoScore);
  const idCount = RUBRIC_PILLARS.filter(
    (p) => company.rubric[p.key] === "Insufficient Data",
  ).length;

  return (
    <TenantShell firm={firm}>
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
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${bandMeta.badgeClass}`}
              >
                PortCo Score · {company.rubric.portcoScore}
              </span>
              <ConfidenceBadge confidence={company.confidence} />
            </div>
          </div>
          <div className="text-left lg:text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">PortCo Score</div>
            <div className="text-5xl font-bold leading-none" style={{ color: bandMeta.color }}>
              {company.rubric.portcoScore}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{bandMeta.description}</p>
            {idCount > 0 && (
              <p className="mt-1.5 text-[11px] text-amber-300/80">
                {idCount} of 4 pillars marked Insufficient Data; scored pillars drive the rating.
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
          <MetaItem label="Framework" value="4 pillars · Low / Medium / High" />
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
      <PillarScorecard rubric={company.rubric} className="mt-4 rounded-xl border border-border bg-card p-4" />

      {/* Priority findings */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <TrendingDown className="h-4 w-4 text-rose-400" /> Priority findings
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ranked by severity of the underlying diagnostic gap
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
                    {scoreLevel(g.score).short}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.note}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground/70">PE value link: {g.pillar.peValue}</p>
              </div>
            </div>
          ))}
          {company.gaps.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {company.displayMax === 0
                ? "No gaps scored — all pillars returned Insufficient Data in this diagnostic."
                : "No material gaps — all pillars are optimized."}
            </p>
          )}
          {company.scores.leadership === null && company.gapNotes?.leadership && (
            <div className="flex gap-3 rounded-lg border border-border bg-background/40 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-foreground">CS Leadership</span>
                  <span className={`text-[11px] font-medium ${scoreLevel(null).textClass}`}>
                    {scoreLevel(null).short}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{company.gapNotes.leadership}</p>
              </div>
            </div>
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
              Companies at this diagnostic level typically carry {tier.arrRisk}, reflecting typical churn
              and contraction patterns at this level rather than a company-specific forecast; for{" "}
              {company.name}, an estimated {company.arrAtRiskDisplay} of {company.arrDisplay} ARR.
            </>
          ) : (
            <>
              Companies at this diagnostic level typically carry {tier.arrRisk}, reflecting typical churn
              and contraction patterns at this level rather than a company-specific forecast.{" "}
              {company.name}&apos;s ARR is undisclosed, so no dollar estimate is shown.
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
            Phase 1 rates each of the 4 pillars Low, Medium, or High using external public signals only
            (LinkedIn, job descriptions, G2/Capterra, company content).
          </li>
          <li>
            The overall PortCo Score rolls the four pillar ratings into a single Low / Medium / High band;
            pillars without enough signal are treated as neutral in the roll-up.
          </li>
          <li>
            Phase 2 upgrades ratings with proprietary connected data once available post-engagement.
          </li>
          <li>
            Pillars that cannot be assessed from public data are marked Insufficient Data and never estimated.
          </li>
        </ul>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span>
            Illustrative design-partner preview. Scores, findings, and ARR-at-risk estimates are sample data for
            demonstration purposes.
          </span>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <TenantExportButton
          firmSlug={firm.slug}
          companySlug={company.id}
          internalOnly={firm.internalOnly}
          requireLogin={firm.requireLogin}
        />
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Prepared for {firm.displayName} by INVESQ · as of {formatDate(AS_OF_DATE)} · Design-partner preview
      </p>
    </TenantShell>
  );
}

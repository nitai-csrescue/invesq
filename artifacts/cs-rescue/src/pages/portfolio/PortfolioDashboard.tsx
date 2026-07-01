import { Link } from "wouter";
import { ArrowUpRight, TrendingDown, Building2, Wallet, Gauge, AlertTriangle } from "lucide-react";
import { PortfolioLayout } from "@/components/portfolio/PortfolioLayout";
import {
  COMPANIES,
  PILLARS,
  TIERS,
  SCORE_LEVELS,
  scoreLevel,
  portfolioSummary,
  formatCurrency,
  formatDate,
  PILLAR_MAX,
  FIRM_NAME,
  AS_OF_DATE,
  type Company,
} from "@/data/portfolioRollup";

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  illustrative,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  sub: string;
  illustrative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary/70" />
      </div>
      <div className="mt-3 font-mono text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {illustrative && <span className="text-amber-300/80">Illustrative · </span>}
        {sub}
      </div>
    </div>
  );
}

function PillarStrip({ company }: { company: Company }) {
  return (
    <div className="flex items-center gap-1">
      {PILLARS.map((p) => {
        const lvl = scoreLevel(company.scores[p.id]);
        return (
          <div
            key={p.id}
            title={`${p.name}: ${lvl.label}`}
            className={`h-1.5 flex-1 rounded-full ${lvl.dotClass} ${
              company.scores[p.id] === null ? "opacity-40" : ""
            }`}
          />
        );
      })}
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const { tier } = company;
  return (
    <Link href={`/portfolio/${company.id}`}>
      <div className="group h-full cursor-pointer rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/80">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
              {company.name}
            </h3>
            <p className="truncate text-xs text-muted-foreground">{company.sector}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-3xl font-bold leading-none" style={{ color: tier.color }}>
              {company.composite}
            </div>
            <div className="text-[10px] text-muted-foreground">/ {company.displayMax}</div>
          </div>
        </div>

        <div className="mt-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tier.badgeClass}`}>
            Tier {tier.id} · {tier.label}
          </span>
        </div>

        <div className="mt-4">
          <PillarStrip company={company} />
        </div>

        {company.topGap && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-background/40 p-2.5">
            <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-rose-300">Top gap · {company.topGap.pillar.name}</div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{company.topGap.note}</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="font-mono text-foreground">{formatCurrency(company.arr)} ARR</span>
          <span>Assessed {formatDate(company.lastDiagnostic)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function PortfolioDashboard() {
  const { tierCounts } = portfolioSummary;
  const maxTierCount = Math.max(...tierCounts.map((t) => t.count), 1);

  return (
    <PortfolioLayout>
      {/* Page heading */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Portfolio Operating Review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer Success operational-diligence rollup across {FIRM_NAME}&apos;s portfolio · as of {formatDate(AS_OF_DATE)}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
          <AlertTriangle className="h-3 w-3" /> Phase 1 external-signal scoring · trend data illustrative
        </span>
      </div>

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Building2}
          label="Portfolio Companies"
          value={String(portfolioSummary.companyCount)}
          sub="Assessed this cycle"
        />
        <KpiCard
          icon={Wallet}
          label="Total ARR"
          value={formatCurrency(portfolioSummary.totalArr)}
          sub="Across assessed companies"
        />
        <KpiCard
          icon={Gauge}
          label="Avg Composite"
          value={`${portfolioSummary.avgComposite}`}
          sub={`of ${PILLAR_MAX} · Phase 1 unweighted`}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Est. ARR at Risk"
          value={formatCurrency(portfolioSummary.arrAtRisk)}
          sub="Preventable, tier-weighted"
          illustrative
        />
      </div>

      {/* Tier distribution */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Engagement tier distribution</h2>
          <span className="text-xs text-muted-foreground">by Phase 1 composite (0–{PILLAR_MAX})</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tierCounts.map(({ tier, count }) => (
            <div key={tier.id}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">
                  Tier {tier.id} · {tier.label}
                </span>
                <span className="font-mono text-lg font-semibold" style={{ color: tier.color }}>
                  {count}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(count / maxTierCount) * 100}%`, backgroundColor: tier.color }}
                />
              </div>
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                {tier.range[0]}–{tier.range[1]} · {tier.arrRisk}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Company grid */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Portfolio companies <span className="text-muted-foreground">· ranked by opportunity</span>
        </h2>
        <span className="text-xs text-muted-foreground">Lowest composite first</span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {COMPANIES.map((c) => (
          <CompanyCard key={c.id} company={c} />
        ))}
      </div>

      {/* Legend / scoring model */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">How scoring works</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              8 pillars · scored 0–2
            </div>
            <ul className="mt-2 space-y-1">
              {PILLARS.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-xs text-foreground">
                  <span>{p.name}</span>
                  <span className="font-mono text-muted-foreground">×{p.weight.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pillar score scale</div>
            <ul className="mt-2 space-y-2">
              {["2", "1", "0", "na"].map((k) => {
                const lvl = SCORE_LEVELS[k];
                return (
                  <li key={k} className="flex items-center gap-2 text-xs text-foreground">
                    <span className={`h-2.5 w-2.5 rounded-full ${lvl.dotClass}`} />
                    <span className="font-mono w-6 text-muted-foreground">{k === "na" ? "N/A" : k}</span>
                    <span>{lvl.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Engagement tiers
            </div>
            <ul className="mt-2 space-y-2">
              {TIERS.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-xs text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="font-mono w-12 text-muted-foreground">
                    {t.range[0]}–{t.range[1]}
                  </span>
                  <span>
                    Tier {t.id} · {t.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
          Phase 1 scores use external public signals only (LinkedIn, G2/Capterra, Glassdoor, job postings, press) and
          are illustrative for this preview. Phase 2 layers in proprietary data (CRM, Gainsight, Gong, product
          telemetry) once INVESQ is engaged, producing a weighted composite (max 19.5).
        </p>
      </div>
    </PortfolioLayout>
  );
}

import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  type Company,
  type Firm,
  type PortfolioSummary,
  type GapItem,
  gapTitle,
  formatDate,
  monthsSince,
  PILLAR_MAX,
} from "@/data/portfolio";

// ---------------------------------------------------------------------------
// ICP eligibility chip — hidden entirely when the company has no ICP inputs
// (fitLabel "Unknown"), so legacy tenants render exactly as before.
// ---------------------------------------------------------------------------
export function IcpEligibilityChip({
  company,
  className = "inline-flex",
}: {
  company: Company;
  className?: string;
}) {
  if (company.fitLabel === "Unknown") return null;

  let colorClass: string;
  let text: string;
  if (!company.eligible) {
    colorClass = "bg-red-100 text-red-800";
    text = `Ineligible · ${company.portfolioStatus}`;
  } else if (company.fitLabel === "Weak") {
    colorClass = "bg-amber-100 text-amber-800";
    text = `Review · ${company.sectorCategory}`;
  } else {
    const months = company.investmentDate
      ? Math.max(0, monthsSince(company.investmentDate))
      : null;
    colorClass = "bg-green-100 text-green-800";
    text = `Eligible · ${company.sectorCategory}${
      months !== null ? ` · Invested ${months}mo ago` : ""
    }`;
  }

  return (
    <span
      title={company.eligibilityReasons.join(" · ")}
      className={`${className} flex-none items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${colorClass}`}
    >
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG sparkline — no Recharts dependency
// ---------------------------------------------------------------------------
function Sparkline({
  points,
  width = 64,
  height = 24,
}: {
  points: number[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (width - pad * 2));
  const ys = points.map((p) => pad + ((max - p) / range) * (height - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={width} height={height}>
      <path
        d={d}
        fill="none"
        stroke={up ? "rgb(52 211 153)" : "rgb(251 113 133)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Compact ops KPI strip — sits above the accordion
// ---------------------------------------------------------------------------
function OpsStrip({ companies }: { companies: Company[] }) {
  const attention = companies.filter((c) => c.tier.id <= 2).length;
  const findings = companies.reduce((s, c) => s + c.gaps.length, 0);
  const avgNorm =
    companies.length > 0
      ? Math.round(
          (companies.reduce((s, c) => s + (c.composite / c.displayMax) * PILLAR_MAX, 0) /
            companies.length) *
            10,
        ) / 10
      : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-card/40 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Active PortCos</span>
        <span className="font-semibold text-foreground">{companies.length}</span>
      </div>
      <div className="hidden h-3 w-px bg-border sm:block" />
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs text-muted-foreground">Needing Attention</span>
        <span className="font-semibold text-amber-300">{attention}</span>
      </div>
      <div className="hidden h-3 w-px bg-border sm:block" />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Open Findings</span>
        <span className="font-semibold text-foreground">{findings}</span>
      </div>
      <div className="hidden h-3 w-px bg-border sm:block" />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Avg Composite</span>
        <span className="font-semibold text-foreground">
          {avgNorm} / {PILLAR_MAX}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gap chip shown inside expanded row
// ---------------------------------------------------------------------------
function GapChip({ company, gap }: { company: Company; gap: GapItem }) {
  const isHigh = gap.score === 0;
  return (
    <div
      className={`rounded-lg border p-3 ${
        isHigh ? "border-rose-500/20 bg-rose-500/5" : "border-amber-500/20 bg-amber-500/5"
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={`text-xs font-medium ${isHigh ? "text-rose-300" : "text-amber-300"}`}>
          {isHigh ? "High" : "Medium"} · {gapTitle(company, gap)}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{gap.note}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact metric tile
// ---------------------------------------------------------------------------
function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort controls
// ---------------------------------------------------------------------------
type SortField = "tier" | "composite" | "name" | "arr";

function SortBtn({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: "asc" | "desc";
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-card hover:text-foreground"
      }`}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Accordion row
// ---------------------------------------------------------------------------
function CompanyRow({
  company,
  firm,
  rank,
  isExpanded,
  onToggle,
}: {
  company: Company;
  firm: Firm;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tier = company.tier;
  const sparkline = company.assessmentPoints.map((p) => p.normalizedComposite);

  return (
    <div className="border-b border-border last:border-0">
      {/* Collapsed trigger row */}
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card/60"
      >
        <span className="w-5 flex-none text-center text-[11px] text-muted-foreground">{rank}</span>

        {/* Score badge */}
        <div
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg font-bold leading-none"
          style={{ backgroundColor: `${tier.color}22`, color: tier.color }}
        >
          <span className="text-sm">{company.compositeDisplay}</span>
          {company.displayMax > 0 && (
            <span className="ml-0.5 text-[8px] opacity-50">/{company.displayMax}</span>
          )}
        </div>

        {/* Name + sector */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{company.name}</div>
          <div className="truncate text-xs text-muted-foreground">{company.sector}</div>
        </div>

        {/* Tier badge */}
        <span
          className={`hidden flex-none items-center rounded-full border px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${tier.badgeClass}`}
        >
          Tier {tier.id} · {tier.label}
        </span>

        {/* ICP eligibility chip (renders nothing without ICP data) */}
        <IcpEligibilityChip company={company} className="hidden sm:inline-flex" />

        {/* ARR */}
        <span className="hidden w-24 flex-none text-right font-mono text-xs text-muted-foreground md:block">
          {company.arrDisplay}
        </span>

        {/* Sparkline */}
        <div className="hidden w-16 flex-none lg:block">
          <Sparkline points={sparkline.slice(-8)} width={64} height={24} />
        </div>

        <ChevronRight
          className={`h-4 w-4 flex-none text-muted-foreground transition-transform duration-200 ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/40 bg-card/20 px-4 pb-5 pt-3">
          {/* Metrics */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricTile
              label="Composite"
              value={
                company.displayMax > 0
                  ? `${company.composite} / ${company.displayMax}`
                  : "N/A"
              }
              sub={`Tier ${tier.id} — ${tier.label}`}
            />
            <MetricTile label="ARR" value={company.arrDisplay} />
            <MetricTile
              label="ARR at Risk"
              value={company.arrAtRiskDisplay}
              sub={tier.arrRisk}
            />
            <MetricTile
              label="Last Assessed"
              value={formatDate(company.lastDiagnostic)}
              sub={
                company.insufficientCount > 0
                  ? `${company.insufficientCount} N/A pillar${company.insufficientCount > 1 ? "s" : ""}`
                  : "All pillars scored"
              }
            />
          </div>

          {/* Top 2 gaps */}
          {company.gaps.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Top findings
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {company.gaps.slice(0, 2).map((gap) => (
                  <GapChip key={gap.pillar.id} company={company} gap={gap} />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/${firm.slug}/portfolio/${company.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              Open Full Report <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={`/${firm.slug}/portfolio/${company.id}/gameplan`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              View 100-Day Gameplan <TrendingUp className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
interface RavigaCompanyListProps {
  companies: Company[];
  firm: Firm;
  summary: PortfolioSummary;
}

export function RavigaCompanyList({ companies, firm, summary }: RavigaCompanyListProps) {
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("tier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("asc");
    }
    setExpandedId(null);
  };

  const filtered = useMemo(() => {
    let result = [...companies];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q),
      );
    }

    if (filterTier !== null) {
      result = result.filter((c) => c.tier.id === filterTier);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "tier") cmp = a.tierComposite - b.tierComposite;
      else if (sortBy === "composite") cmp = a.composite - b.composite;
      else if (sortBy === "arr") {
        const aM = a.arrForRollup ? (a.arrForRollup[0] + a.arrForRollup[1]) / 2 : 0;
        const bM = b.arrForRollup ? (b.arrForRollup[0] + b.arrForRollup[1]) / 2 : 0;
        cmp = aM - bM;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [companies, search, filterTier, sortBy, sortDir]);

  return (
    <div className="mt-6 space-y-4">
      {/* Search + filter + sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search box */}
        <div className="relative min-w-[180px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setExpandedId(null);
            }}
            placeholder="Search companies…"
            className="w-full rounded-md border border-border bg-card py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        {/* Tier filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[null, 1, 2, 3, 4].map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => {
                setFilterTier(t);
                setExpandedId(null);
              }}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                filterTier === t
                  ? "border-primary/30 bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === null ? "All" : `T${t}`}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">Sort:</span>
          {(["tier", "composite", "arr", "name"] as SortField[]).map((f) => (
            <SortBtn
              key={f}
              label={f === "arr" ? "ARR" : f === "composite" ? "Score" : f.charAt(0).toUpperCase() + f.slice(1)}
              field={f}
              current={sortBy}
              dir={sortDir}
              onSort={handleSort}
            />
          ))}
        </div>
      </div>

      {/* Accordion table */}
      <div className="overflow-hidden rounded-xl border border-border">
        {/* Column header */}
        <div className="hidden items-center gap-3 border-b border-border bg-card/60 px-4 py-2 sm:flex">
          <span className="w-5" />
          <span className="w-10" />
          <span className="flex-1 text-[11px] uppercase tracking-wider text-muted-foreground">Company</span>
          <span className="hidden w-44 text-[11px] uppercase tracking-wider text-muted-foreground sm:block">
            Tier
          </span>
          <span className="hidden w-24 text-right text-[11px] uppercase tracking-wider text-muted-foreground md:block">
            ARR
          </span>
          <span className="hidden w-16 text-center text-[11px] uppercase tracking-wider text-muted-foreground lg:block">
            Trend
          </span>
          <span className="w-4" />
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No companies match your filters.
          </div>
        ) : (
          filtered.map((c, i) => (
            <CompanyRow
              key={c.id}
              company={c}
              firm={firm}
              rank={i + 1}
              isExpanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            />
          ))
        )}
      </div>

      {summary.arrUndisclosedCount > 0 && (
        <p className="text-[11px] text-muted-foreground">
          ² {summary.arrUndisclosedNames.join(" and ")} ARR is undisclosed and excluded from portfolio rollups.
        </p>
      )}
    </div>
  );
}

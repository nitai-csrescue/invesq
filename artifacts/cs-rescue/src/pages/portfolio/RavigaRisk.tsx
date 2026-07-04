import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import {
  getFirm,
  getFirmCompanies,
  getFirmSummary,
  gapTitle,
  formatCurrency,
  type Company,
} from "@/data/portfolio";
import { Info } from "lucide-react";
import { RavigaShell } from "@/components/portfolio/RavigaShell";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function midpoint([lo, hi]: [number, number]): number {
  return (lo + hi) / 2;
}

function allocatePerGap(arrAtRiskRange: [number, number], gapCount: number): number {
  if (gapCount === 0) return 0;
  return Math.round(midpoint(arrAtRiskRange) / gapCount / 1000) * 1000;
}

// ---------------------------------------------------------------------------
// Shared: tab switcher
// ---------------------------------------------------------------------------

type Tab = "portfolio" | "ledger" | "simulator";

const TABS: { id: Tab; label: string }[] = [
  { id: "portfolio", label: "Portfolio View" },
  { id: "ledger", label: "Risk Ledger" },
  { id: "simulator", label: "Recovery Simulator" },
];

function TabSwitcher({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            active === id
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: company selector (peer tab strip)
// ---------------------------------------------------------------------------

function CompanySelector({
  companies,
  selectedId,
  onSelect,
}: {
  companies: Company[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {companies.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
            c.id === selectedId
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary/40"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.tier.color }} />
          {c.name}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: ledger line type + builder
// ---------------------------------------------------------------------------

interface LedgerLine {
  id: string;
  name: string;
  note: string;
  amount: number;
  severity: "High" | "Medium";
}

function buildLedger(company: Company): LedgerLine[] {
  const { gaps, arrAtRiskRange } = company;
  if (gaps.length === 0 || !arrAtRiskRange) return [];
  const perGap = allocatePerGap(arrAtRiskRange, gaps.length);
  return gaps.map((g) => ({
    id: g.pillar.id,
    name: gapTitle(company, g),
    note: g.note,
    amount: perGap,
    severity: (g.score === 0 ? "High" : "Medium") as "High" | "Medium",
  }));
}

// ---------------------------------------------------------------------------
// Tab 1 — Portfolio View
// ---------------------------------------------------------------------------

function PortfolioTab({
  companies,
  summaryDisplay,
}: {
  companies: Company[];
  summaryDisplay: string;
}) {
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(
    () =>
      [...companies].sort((a, b) => {
        const aM = a.arrAtRiskRange ? midpoint(a.arrAtRiskRange) : 0;
        const bM = b.arrAtRiskRange ? midpoint(b.arrAtRiskRange) : 0;
        return sortDesc ? bM - aM : aM - bM;
      }),
    [companies, sortDesc],
  );

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Total estimated ARR at risk · All Raviga portfolio companies
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <span className="font-mono text-5xl font-bold text-rose-700">{summaryDisplay}</span>
          <span className="mb-1 text-xs text-muted-foreground">
            Sum of per-company ranges · companies with undisclosed ARR excluded · illustrative
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Based on each company's ARR range and diagnostic tier, reflecting typical churn and
          contraction patterns at their tier rather than a company-specific forecast.
        </p>
      </div>

      {/* Sortable table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Company
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                ARR
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tier
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gaps
              </th>
              <th
                className="cursor-pointer select-none px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                onClick={() => setSortDesc((d) => !d)}
              >
                <span className="inline-flex items-center gap-1">
                  Est. ARR at risk {sortDesc ? "↓" : "↑"}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-muted/30">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.sector}</div>
                </td>
                <td className="px-4 py-3.5 text-sm text-foreground">{c.arrDisplay}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${c.tier.badgeClass}`}
                  >
                    T{c.tier.id}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm text-foreground">{c.gaps.length}</td>
                <td className="px-5 py-3.5 text-right font-mono text-sm font-semibold text-foreground">
                  {c.arrAtRiskDisplay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Click "Est. ARR at risk" header to toggle sort direction. Illustrative ·
        Phase&nbsp;1 diagnostic data.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 — Risk Ledger
// ---------------------------------------------------------------------------

function LedgerTab({
  companies,
  selectedId,
  onSelect,
}: {
  companies: Company[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const company = companies.find((c) => c.id === selectedId) ?? companies[0];
  const ledger = useMemo(() => buildLedger(company), [company]);
  const ledgerTotal = ledger.reduce((s, l) => s + l.amount, 0);

  return (
    <div>
      <CompanySelector companies={companies} selectedId={company.id} onSelect={onSelect} />

      {/* Company header card */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div>
          <div className="text-base font-semibold text-foreground">{company.name}</div>
          <div className="text-xs text-muted-foreground">
            {company.sector} · {company.arrDisplay}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Est. ARR at risk
          </div>
          <div className="font-mono text-2xl font-bold text-rose-700">
            {company.arrAtRiskDisplay}
          </div>
          <div className="text-[11px] text-slate-500">
            Illustrative · {company.tier.arrRisk} · typical exposure for this tier
          </div>
        </div>
      </div>

      {company.arrAtRiskRange === null ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          ARR is undisclosed for {company.name} — gap allocation not available.
        </div>
      ) : ledger.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No identified gaps for {company.name} at this diagnostic stage.
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span>
              Illustrative split across identified gaps — not a certified per-issue estimate.
              Figures rounded to nearest $1K; equal allocation is a simplification and actual
              exposure concentration will vary.
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-5 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gap · Illustrative ARR allocation
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Allocated at risk
              </span>
            </div>

            {ledger.map((line) => (
              <div
                key={line.id}
                className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 last:border-0 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        line.severity === "High"
                          ? "border-rose-300 bg-rose-100 text-rose-800"
                          : "border-amber-300 bg-amber-100 text-amber-800"
                      }`}
                    >
                      {line.severity}
                    </span>
                    <span className="text-sm font-medium text-foreground">{line.name}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{line.note}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-base font-semibold text-rose-700">
                    {formatCurrency(line.amount)}
                  </div>
                </div>
              </div>
            ))}

            {/* Footer total */}
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
              <div>
                <span className="text-xs font-semibold text-foreground">
                  Total (midpoint basis)
                </span>
                <span className="ml-2 text-[11px] text-muted-foreground">
                  equal split across {ledger.length} gap{ledger.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="font-mono text-base font-bold text-rose-700">
                {formatCurrency(ledgerTotal)}
              </span>
            </div>
          </div>

        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3 — Recovery Simulator
// ---------------------------------------------------------------------------

function SimulatorTab({
  companies,
  selectedId,
  onSelect,
}: {
  companies: Company[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const company = companies.find((c) => c.id === selectedId) ?? companies[0];
  const ledger = useMemo(() => buildLedger(company), [company]);

  const [addressed, setAddressed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setAddressed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const addressedTotal = ledger
    .filter((l) => addressed.has(l.id))
    .reduce((s, l) => s + l.amount, 0);
  const stillAtRisk = ledger
    .filter((l) => !addressed.has(l.id))
    .reduce((s, l) => s + l.amount, 0);
  const addressedCount = addressed.size;
  const unadressedCount = ledger.length - addressedCount;

  return (
    <div>
      <CompanySelector companies={companies} selectedId={company.id} onSelect={onSelect} />

      {company.arrAtRiskRange === null ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          ARR is undisclosed for {company.name} — simulation not available.
        </div>
      ) : ledger.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No identified gaps for {company.name}.
        </div>
      ) : (
        <>
          {/* Illustrative disclaimer */}
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span>
              Illustrative. Click rows to model "what if" recovery scenarios — not a certified per-issue projection.
            </span>
          </div>
          {/* Live counter cards */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                ARR still at risk
              </div>
              <div className="font-mono text-3xl font-bold text-rose-700">
                {stillAtRisk > 0 ? formatCurrency(stillAtRisk) : "—"}
              </div>
              <div className="mt-1 text-xs text-rose-600/80">
                {unadressedCount} gap{unadressedCount !== 1 ? "s" : ""} not yet addressed
              </div>
            </div>
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Protected if addressed
              </div>
              <div className="font-mono text-3xl font-bold text-emerald-700">
                {addressedTotal > 0 ? formatCurrency(addressedTotal) : "—"}
              </div>
              <div className="mt-1 text-xs text-emerald-600/80">
                {addressedCount} gap{addressedCount !== 1 ? "s" : ""} marked addressed
              </div>
            </div>
          </div>

          {/* Interactive ledger */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-muted/50 px-5 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Click a row to mark that gap as addressed
              </span>
            </div>

            {ledger.map((line) => {
              const done = addressed.has(line.id);
              return (
                <div
                  key={line.id}
                  className={`flex cursor-pointer items-start gap-4 border-b border-border px-5 py-4 last:border-0 transition-colors ${
                    done ? "bg-emerald-50/70" : "hover:bg-muted/20"
                  }`}
                  onClick={() => toggle(line.id)}
                >
                  {/* Checkbox */}
                  <div className="mt-0.5 shrink-0">
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-all ${
                        done ? "border-emerald-600 bg-emerald-600" : "border-border bg-background"
                      }`}
                    >
                      {done && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8">
                          <path
                            d="M1 4l3 3 5-6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          line.severity === "High"
                            ? "border-rose-300 bg-rose-100 text-rose-800"
                            : "border-amber-300 bg-amber-100 text-amber-800"
                        }`}
                      >
                        {line.severity}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          done ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {line.name}
                      </span>
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        done ? "text-muted-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {line.note}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <div
                      className={`font-mono text-base font-semibold ${
                        done ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {done ? "+" : ""}
                      {formatCurrency(line.amount)}
                    </div>
                    <div
                      className={`text-[11px] ${done ? "text-emerald-600" : "text-muted-foreground"}`}
                    >
                      {done ? "protected" : "at risk"}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
              <span className="text-xs font-semibold text-foreground">
                Total (midpoint basis)
              </span>
              <span className="font-mono text-base font-bold text-rose-700">
                {formatCurrency(ledger.reduce((s, l) => s + l.amount, 0))}
              </span>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">
            Illustrative split across identified gaps — not a certified per-issue estimate.
            Checkboxes are client-side only; state is not persisted.
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RavigaRisk() {
  const [, params] = useRoute("/:firmSlug/risk");
  const firmSlug = params?.firmSlug ?? "raviga";

  const firm = getFirm(firmSlug);
  const companies = getFirmCompanies(firmSlug);
  const summary = getFirmSummary(firmSlug);

  const [tab, setTab] = useState<Tab>("portfolio");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    () => companies[0]?.id ?? "",
  );

  if (!firm || !summary) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Firm not found.</div>
    );
  }

  return (
    <RavigaShell firm={firm}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Risk &amp; ROI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estimated ARR exposure by portfolio company and identified gap · Illustrative
          Phase&nbsp;1 diagnostic
        </p>
      </div>

      <div className="mb-6">
        <TabSwitcher active={tab} onChange={setTab} />
      </div>

      {tab === "portfolio" && (
        <PortfolioTab
          companies={companies}
          summaryDisplay={summary.arrAtRiskDisplay}
        />
      )}

      {tab === "ledger" && (
        <LedgerTab
          key={selectedCompanyId}
          companies={companies}
          selectedId={selectedCompanyId}
          onSelect={setSelectedCompanyId}
        />
      )}

      {tab === "simulator" && (
        <SimulatorTab
          key={selectedCompanyId}
          companies={companies}
          selectedId={selectedCompanyId}
          onSelect={setSelectedCompanyId}
        />
      )}
    </RavigaShell>
  );
}

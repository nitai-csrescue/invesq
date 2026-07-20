import { Link, useRoute } from "wouter";
import { TenantShell } from "@/components/portfolio/TenantShell";
import { RavigaCompanyList } from "./RavigaCompanyList";
import { getFirm, getFirmCompanies, getFirmSummary } from "@/data/portfolio";

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

function FirmDataUnavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="text-6xl font-bold text-muted-foreground/30">···</div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Portfolio data unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This firm's diagnostic data hasn't been loaded yet. Please check back shortly.
        </p>
      </div>
    </div>
  );
}

export default function PortfolioDashboard() {
  const [, params] = useRoute("/:firmSlug/portfolio");
  const firmSlug = params?.firmSlug ?? "";
  const firm = getFirm(firmSlug);

  if (!firm) return <FirmNotFound />;

  const companies = getFirmCompanies(firmSlug);
  const summary = getFirmSummary(firmSlug);

  if (!summary) return <FirmDataUnavailable />;

  const isRaviga = firmSlug === "raviga";
  const bandCounts = {
    Low: companies.filter((c) => c.rubric.portcoScore === "Low").length,
    Medium: companies.filter((c) => c.rubric.portcoScore === "Medium").length,
    High: companies.filter((c) => c.rubric.portcoScore === "High").length,
  };
  const attentionCount = bandCounts.Low;
  const openFindings = companies.reduce((s, c) => s + c.gaps.length, 0);

  return (
    <TenantShell firm={firm}>
      {/* Page header */}
      <div className="mb-7">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {firm.displayName.toUpperCase()}
          {isRaviga ? " · FUND III" : ""}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-foreground">Portfolio Overview</h1>
            {firm.icpFit && firm.icpFit !== "Unknown" && (
              <span
                title="Firm-level ICP fit rating assigned by INVESQ"
                className="inline-flex items-center gap-1.5"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  ICP Fit
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    firm.icpFit === "Strong"
                      ? "bg-green-100 text-green-800"
                      : firm.icpFit === "Moderate"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {firm.icpFit}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${firmSlug}/benchmarks`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Benchmarks
            </Link>
            <Link
              href={`/${firmSlug}/findings`}
              className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1e3a5f" }}
            >
              View Findings
            </Link>
          </div>
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-3xl font-bold text-foreground">{summary.companyCount}</div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Portfolio Companies
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-3xl font-bold text-foreground">{summary.totalArrDisplay}</div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Combined ARR
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-baseline gap-2.5 text-3xl font-bold">
            <span className="text-rose-400">{bandCounts.Low}</span>
            <span className="text-amber-400">{bandCounts.Medium}</span>
            <span className="text-emerald-400">{bandCounts.High}</span>
          </div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            PortCo Score Mix
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground/70">Low / Medium / High</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div
            className={`text-4xl font-black ${attentionCount > 0 ? "text-amber-600" : "text-emerald-600"}`}
          >
            {attentionCount}
          </div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Need Attention
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground/70">Low PortCo Score</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-3xl font-bold text-foreground">{openFindings}</div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Open Findings
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground/70">across portfolio</div>
        </div>
      </div>

      {/* Portfolio accordion table */}
      <RavigaCompanyList companies={companies} firm={firm} summary={summary} />
    </TenantShell>
  );
}

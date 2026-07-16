import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { AlertTriangle, ArrowRight, Building2, Cloud, Activity, Phone, Radio } from "lucide-react";
import {
  useGetRavigaSignals,
  getGetRavigaSignalsQueryKey,
  type SignalRecord,
} from "@workspace/api-client-react";
import {
  getFirm,
  getFirmCompanies,
  gapTitle,
  getLiveSignalsForCompanies,
  PILLARS,
  type Company,
  type GapItem,
  type ConnectorId,
  type LiveSignal,
  type LiveSignalSeverity,
} from "@/data/portfolio";
import { TenantShell } from "@/components/portfolio/TenantShell";
import { DiagnosticSignalCard } from "@/components/portfolio/DiagnosticSignals";

type Severity = "All" | "High" | "Medium";
type LiveSeverityFilter = "All" | LiveSignalSeverity;
type LiveSourceFilter = "All" | ConnectorId;

const SOURCE_ICON: Record<ConnectorId, typeof Cloud> = {
  salesforce: Cloud,
  gainsight: Activity,
  gong: Phone,
  "product-telemetry": Radio,
};

const LIVE_SEVERITY_STYLES: Record<LiveSignalSeverity, string> = {
  High: "border-rose-300 bg-rose-100 text-rose-800",
  Medium: "border-amber-300 bg-amber-100 text-amber-800",
  Low: "border-sky-300 bg-sky-100 text-sky-800",
};

// ---------------------------------------------------------------------------
// Finding shape
// ---------------------------------------------------------------------------
interface Finding {
  key: string;
  companyId: string;
  companyName: string;
  tierBadgeClass: string;
  tierId: number;
  pillarName: string;
  severity: "High" | "Medium";
  note: string;
  peValue: string;
  company: Company;
  gap: GapItem;
}

function buildFindings(companies: Company[]): Finding[] {
  const findings: Finding[] = [];
  for (const c of companies) {
    for (const gap of c.gaps) {
      findings.push({
        key: `${c.id}-${gap.pillar.id}`,
        companyId: c.id,
        companyName: c.name,
        tierBadgeClass: c.tier.badgeClass,
        tierId: c.tier.id,
        pillarName: gapTitle(c, gap),
        severity: gap.score === 0 ? "High" : "Medium",
        note: gap.note,
        peValue: gap.pillar.peValue,
        company: c,
        gap,
      });
    }
  }
  findings.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "High" ? -1 : 1;
    if (a.tierId !== b.tierId) return a.tierId - b.tierId;
    return b.gap.weakness - a.gap.weakness;
  });
  return findings;
}

// ---------------------------------------------------------------------------
// Finding card
// ---------------------------------------------------------------------------
function FindingCard({ finding, firmSlug }: { finding: Finding; firmSlug: string }) {
  const isHigh = finding.severity === "High";
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 ${
        isHigh ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              isHigh
                ? "border-rose-300 bg-rose-100 text-rose-800"
                : "border-amber-300 bg-amber-100 text-amber-800"
            }`}
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            {finding.severity}
          </span>
          <span className="text-sm font-semibold text-foreground">{finding.pillarName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Link
            href={`/${firmSlug}/portfolio/${finding.companyId}`}
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            {finding.companyName}
          </Link>
          <span
            className={`ml-1 rounded border px-1.5 py-0.5 text-[10px] ${
              finding.tierId === 1
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : finding.tierBadgeClass
            }`}
          >
            T{finding.tierId}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-muted-foreground">{finding.note}</p>

      {/* Footer */}
      <div className="-mt-1 flex items-start justify-between gap-3 border-t border-border/40 pt-2.5">
        <p className="text-[11px] text-muted-foreground/70">
          <span className="font-medium text-muted-foreground">PE value link: </span>
          {finding.peValue}
        </p>
        <Link
          href={`/${firmSlug}/portfolio/${finding.companyId}/gameplan`}
          className="inline-flex flex-none items-center gap-1 text-[11px] text-primary/70 transition-colors hover:text-primary"
        >
          Gameplan <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function FirmNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-muted-foreground">Firm not found.</p>
    </div>
  );
}

export default function RavigaFindings() {
  const [, params] = useRoute("/:firmSlug/findings");
  const firmSlug = params?.firmSlug ?? "";
  const firm = getFirm(firmSlug);
  if (!firm) return <FirmNotFound />;

  const isRaviga = firmSlug === "raviga";
  const companies = getFirmCompanies(firmSlug);
  const allFindings = useMemo(() => buildFindings(companies), [companies]);

  const [severity, setSeverity] = useState<Severity>("All");

  const filtered =
    severity === "All" ? allFindings : allFindings.filter((f) => f.severity === severity);

  const highCount = allFindings.filter((f) => f.severity === "High").length;
  const medCount = allFindings.filter((f) => f.severity === "Medium").length;

  // ── Live Signals (Raviga only, simulated connected-data feed) ────────────
  const liveSignals: LiveSignal[] = useMemo(
    () => (isRaviga ? getLiveSignalsForCompanies(companies) : []),
    [companies, isRaviga],
  );
  const [signalSource, setSignalSource] = useState<LiveSourceFilter>("All");
  const [signalSeverity, setSignalSeverity] = useState<LiveSeverityFilter>("All");
  const filteredSignals = liveSignals.filter(
    (s) =>
      (signalSource === "All" || s.source === signalSource) &&
      (signalSeverity === "All" || s.severity === signalSeverity),
  );

  // ── Diagnostic Signals (Raviga only, DB-backed structured evidence) ──────
  // Distinct from the simulated Live Signals feed above: these are real
  // per-pillar evidence records captured during pipeline scoring. The query
  // never fires for any other tenant (enabled: isRaviga).
  const { data: diagnosticData } = useGetRavigaSignals({
    query: { queryKey: getGetRavigaSignalsQueryKey(), enabled: isRaviga },
  });
  const diagnosticSignals: SignalRecord[] = isRaviga ? (diagnosticData?.signals ?? []) : [];
  const companyNameBySlug = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );
  const signalsByPillar = useMemo(() => {
    const map = new Map<string, SignalRecord[]>();
    for (const s of diagnosticSignals) {
      const arr = map.get(s.pillarId) ?? [];
      arr.push(s);
      map.set(s.pillarId, arr);
    }
    return map;
  }, [diagnosticSignals]);

  return (
    <TenantShell firm={firm}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio Findings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allFindings.length} findings across {companies.length} companies · Phase 1
            external-signal diagnostics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800">
            <AlertTriangle className="h-3 w-3" /> {highCount} High
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-3 w-3" /> {medCount} Medium
          </span>
        </div>
      </div>

      {/* Severity filter */}
      <div className="mb-6 flex items-center gap-2">
        {(["All", "High", "Medium"] as Severity[]).map((s) => (
          <button
            key={s}
            onClick={() => setSeverity(s)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              severity === s
                ? "border-primary/30 bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
            {s !== "All" && (
              <span className="ml-1.5 text-xs opacity-60">
                ({s === "High" ? highCount : medCount})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Findings grid */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No findings at this severity level.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((f) => (
            <FindingCard key={f.key} finding={f} firmSlug={firmSlug} />
          ))}
        </div>
      )}

      {isRaviga && (
        <div className="mt-10 border-t border-border pt-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">Diagnostic Signals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {diagnosticSignals.length} structured evidence record
              {diagnosticSignals.length === 1 ? "" : "s"} captured during Phase 1 diagnostic
              scoring · grouped by pillar
            </p>
          </div>
          {diagnosticSignals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No structured diagnostic signals recorded yet. Signals are captured automatically
              the next time this portfolio is scored.
            </p>
          ) : (
            <div className="space-y-6">
              {PILLARS.filter((p) => (signalsByPillar.get(p.id)?.length ?? 0) > 0).map((p) => (
                <div key={p.id}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{p.name}</h3>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {signalsByPillar.get(p.id)!.map((s) => (
                      <DiagnosticSignalCard
                        key={s.id}
                        signal={s}
                        companyName={companyNameBySlug.get(s.companySlug) ?? s.companySlug}
                        companyHref={`/${firmSlug}/portfolio/${s.companySlug}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isRaviga && liveSignals.length > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Live Signals</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredSignals.length} of {liveSignals.length} signals · simulated connected-data
                feed · events from the last 14 days
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={signalSource}
                onChange={(e) => setSignalSource(e.target.value as LiveSourceFilter)}
                className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              >
                <option value="All">All sources</option>
                <option value="salesforce">Salesforce</option>
                <option value="gainsight">Gainsight</option>
                <option value="gong">Gong</option>
                <option value="product-telemetry">Product Telemetry</option>
              </select>
              <select
                value={signalSeverity}
                onChange={(e) => setSignalSeverity(e.target.value as LiveSeverityFilter)}
                className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              >
                <option value="All">All severities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {filteredSignals.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No live signals match these filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filteredSignals.map((s) => {
                const SourceIcon = SOURCE_ICON[s.source];
                return (
                  <div
                    key={s.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5"
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border ${LIVE_SEVERITY_STYLES[s.severity]}`}
                    >
                      <SourceIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/${firmSlug}/portfolio/${s.companyId}`}
                          className="text-xs font-semibold text-foreground transition-colors hover:text-primary"
                        >
                          {s.companyName}
                        </Link>
                        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {s.pillarName}
                        </span>
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${LIVE_SEVERITY_STYLES[s.severity]}`}
                        >
                          {s.severity}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {s.message}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                        <SourceIcon className="h-3 w-3" /> {s.sourceLabel} ·{" "}
                        {s.daysAgo === 0 ? "Today" : `${s.daysAgo}d ago`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-[10px] italic text-amber-600/70">
            Simulated connection — demo environment. Signals illustrate what a live Phase 2
            connected-data feed would surface once activated.
          </p>
        </div>
      )}

      <div className="mt-8 border-t border-border pt-4 text-[11px] text-muted-foreground/50">
        All findings are based on Phase 1 external-signal diagnostics (LinkedIn, G2/Capterra, job
        postings, press). Phase 2 engagement validates with proprietary CRM, Gainsight, and product
        data.
      </div>
    </TenantShell>
  );
}

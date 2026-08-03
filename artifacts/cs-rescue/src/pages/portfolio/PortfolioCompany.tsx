import { useState, useEffect, type ReactNode } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  CalendarClock,
  TrendingDown,
  Info,
  Plug,
  X,
  Percent,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";
import {
  getRecommendedPlaybooks,
  type PillarPlaybook,
} from "@workspace/portfolio-engine";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  useGetRavigaSignals,
  getGetRavigaSignalsQueryKey,
  useGetCsRescueInternalBackengine,
  getGetCsRescueInternalBackengineQueryKey,
  type SignalRecord,
  type BackengineEvidence,
} from "@workspace/api-client-react";
import { ConfidenceBadge } from "@/components/portfolio/ConfidenceBadge";
import { TenantShell } from "@/components/portfolio/TenantShell";
import { DiagnosticSignalCard } from "@/components/portfolio/DiagnosticSignals";
import { PortcoReportWorkflow } from "./PortcoReportWorkflow";
import { IcpEligibilityChip } from "./RavigaCompanyList";
import {
  getFirm,
  getFirmCompany,
  getFirmCompanies,
  gapTitle,
  scoreLevel,
  formatDate,
  AS_OF_DATE,
  getConnectorLiveStatus,
  getRetentionMetrics,
  RUBRIC_PILLARS,
  rubricBandMeta,
  portcoOrdinal,
  type Company,
  type Firm,
  type ConnectorId,
} from "@/data/portfolio";

function Meta({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary/70" />
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xs font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function PortcoScoreRing({ company }: { company: Company }) {
  const meta = rubricBandMeta(company.rubric.portcoScore);
  const pct = portcoOrdinal(company.rubric.portcoScore) / 3;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={meta.color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-[10px] text-muted-foreground">PortCo Score</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assessment-driven trend chart
// ---------------------------------------------------------------------------

function periodLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
}

const BAND_TICK_LABELS: Record<number, string> = { 1: "Low", 2: "Med", 3: "High" };
const BAND_FULL_LABELS: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High" };

function TrendChart({ company }: { company: Company }) {
  const meta = rubricBandMeta(company.rubric.portcoScore);
  const data = company.rubricPoints.map((p) => ({
    period: periodLabel(p.date),
    band: portcoOrdinal(p.band),
  }));
  const count = data.length;

  return (
    <div>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
          <YAxis
            domain={[0.5, 3.5]}
            ticks={[1, 2, 3]}
            tickFormatter={(v: number) => BAND_TICK_LABELS[v] ?? ""}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--foreground))",
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            formatter={(value: number) => [BAND_FULL_LABELS[value] ?? "", "PortCo Score"]}
          />
          <Line
            type="stepAfter"
            dataKey="band"
            stroke={meta.color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: meta.color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          {(company.actionsLog ?? []).map((entry) => (
            <ReferenceLine
              key={entry.date}
              x={periodLabel(entry.date)}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded" style={{ backgroundColor: meta.color }} />
          <span>
            PortCo Score ({count} {count === 1 ? "assessment" : "assessments"})
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawer — slide-in panel (right on desktop, bottom sheet on mobile)
// ---------------------------------------------------------------------------

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed bottom-0 right-0 z-50 flex flex-col overflow-hidden border-border bg-background transition-transform duration-300 h-[88vh] w-full rounded-t-xl border-t sm:top-0 sm:h-full sm:w-[480px] sm:rounded-none sm:border-l sm:border-t-0 ${
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        <div className="flex shrink-0 justify-center py-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pillar methodology drawer — raviga only; surfaces measures/signals/PE value
// ---------------------------------------------------------------------------

function PillarMethodologyDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      >
        <Info className="h-3.5 w-3.5" /> Methodology
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Pillar methodology">
        <div className="space-y-5">
          {RUBRIC_PILLARS.map((p) => (
            <div key={p.key} className="border-b border-border pb-5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground">Low / Medium / High</span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.measures}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Each pillar is rated from external public signals. Pillars without enough signal are marked
            Insufficient Data and treated as neutral in the overall PortCo Score.
          </p>
        </div>
      </Drawer>
    </>
  );
}

const PHASE2_CONNECTORS = [
  { label: "CRM", example: "Salesforce / HubSpot" },
  { label: "CS Platform", example: "Gainsight / Planhat / ChurnZero" },
  { label: "Conversation Intelligence", example: "Gong / Chorus" },
  { label: "Product Telemetry", example: "" },
] as const;

// PHASE2_CONNECTORS cards map 1:1 to CONNECTOR_DEFS by position (CRM →
// Salesforce, CS Platform → Gainsight, Conversation Intelligence → Gong,
// Product Telemetry → Product Telemetry).
const PHASE2_CONNECTOR_IDS: readonly ConnectorId[] = [
  "salesforce",
  "gainsight",
  "gong",
  "product-telemetry",
];

function Phase2Integrations({ company, isRaviga }: { company: Company; isRaviga: boolean }) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary/70" />
          <h2 className="text-sm font-semibold text-foreground">Integrations · Phase 2</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {isRaviga ? "Simulated for this design-partner preview" : "Activate in a Phase 2 engagement"}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Telemetry connections activate in a Phase 2 engagement; ratings upgrade from external-signal
        coverage to the connected proprietary data model.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PHASE2_CONNECTORS.map((conn, i) => {
          const live = isRaviga ? getConnectorLiveStatus(company.id, PHASE2_CONNECTOR_IDS[i]) : null;
          return (
            <div key={conn.label} className="rounded-lg border border-border bg-background/40 p-4">
              <div className="text-xs font-medium text-foreground">{conn.label}</div>
              {conn.example && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">{conn.example}</div>
              )}
              <div className="mt-3 flex items-center justify-between">
                {live ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Connected
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Not connected</span>
                )}
                <button
                  disabled
                  className={`cursor-not-allowed rounded border px-2.5 py-1 text-[11px] font-medium ${
                    live
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-background text-muted-foreground opacity-50"
                  }`}
                >
                  {live ? "Connected" : "Connect"}
                </button>
              </div>
              {live && (
                <div className="mt-2 space-y-0.5">
                  <div className="text-[10px] text-muted-foreground">
                    Last synced {live.lastSyncedMinutesAgo}m ago · {live.recordCount.toLocaleString()} records
                  </div>
                  <div className="text-[10px] italic text-amber-300/70">{live.label}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Raviga-pilot card: diagnostic-aligned playbooks recommended from real
// pillar-score gaps (Low/Medium). Rendered ONLY for the raviga tenant —
// every other firm's page must be byte-identical to pre-pilot.
function RecommendedPlaybooksCard({ company }: { company: Company }) {
  const recommended = getRecommendedPlaybooks(company);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyPrompt = async (pb: PillarPlaybook) => {
    try {
      await navigator.clipboard.writeText(pb.masterPrompt);
      setCopiedId(pb.id);
      setTimeout(() => setCopiedId((cur) => (cur === pb.id ? null : cur)), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — leave state unchanged.
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <BookOpen className="h-4 w-4 text-primary/80" /> Recommended playbooks
      </h2>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Surfaced from pillar scores below High · pilot preview
      </p>
      {recommended.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No pillar gaps below High — no playbook recommendations right now
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {recommended.map((pb) => (
            <div key={pb.id} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="text-xs font-medium text-foreground">{pb.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{pb.tagline}</p>
              <ul className="mt-2 space-y-1">
                {pb.whatItProduces.map((item) => (
                  <li key={item} className="flex gap-1.5 text-[11px] text-muted-foreground">
                    <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => copyPrompt(pb)}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40"
              >
                {copiedId === pb.id ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy Master Prompt
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyNotFound({ firm }: { firm: Firm }) {
  return (
    <TenantShell firm={firm}>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-lg font-semibold text-foreground">Company not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This portfolio company isn&apos;t in the current rollup.
        </p>
        <Link
          href={`/${firm.slug}/portfolio`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-primary/40"
        >
          <ArrowLeft className="h-4 w-4" /> Back to portfolio
        </Link>
      </div>
    </TenantShell>
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

// ---------------------------------------------------------------------------
// CS Rescue Internal dogfood — anonymized BackEngine evidence section.
// Renders ONLY deterministic "Prospect N" placeholders; real account names
// never reach this payload (they live solely in the Admin-Lens-gated name
// map). Accounts-tab rows render as a relationship list; Monitor/Feed rows
// render grouped by category.
// ---------------------------------------------------------------------------
function BackengineEvidenceSection({ data }: { data: BackengineEvidence }) {
  const { accounts, signals } = data;
  if (accounts.length === 0 && signals.length === 0) return null;
  const byCategory = new Map<string, typeof signals>();
  for (const s of signals) {
    const key = s.field ?? "Uncategorized";
    byCategory.set(key, [...(byCategory.get(key) ?? []), s]);
  }
  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            BackEngine telemetry — anonymized account relationships
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tier 2 evidence (Telemetry Integration). Account identities are anonymized at import;
            placeholders are stable across re-imports.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
          {accounts.length} accounts
        </span>
      </div>
      {accounts.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Account</th>
                <th className="py-2 pr-3 font-medium">Quarterly sentiment</th>
                <th className="py-2 pr-3 font-medium">Monthly sentiment</th>
                <th className="py-2 pr-3 font-medium">Emails recv (12w)</th>
                <th className="py-2 pr-3 font-medium">Emails sent (12w)</th>
                <th className="py-2 font-medium">Meetings (12w)</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.placeholder} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-medium text-foreground">{a.placeholder}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{a.quarterlySentiment ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{a.monthlySentiment ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{a.emailsReceived ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{a.emailsSent ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">{a.meetings ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Engagement metrics show "—" until BackEngine backfills quantitative history — a valid
            zero-metrics state, not an import error.
          </p>
        </div>
      )}
      {byCategory.size > 0 && (
        <div className="mt-4 space-y-3">
          {[...byCategory.entries()].map(([category, rows]) => (
            <div key={category}>
              <div className="text-xs font-medium text-foreground">{category}</div>
              <div className="mt-1.5 space-y-1.5">
                {rows.map((s) => (
                  <div key={s.id} className="rounded-lg border border-border bg-background/40 p-2.5">
                    <p className="text-xs text-muted-foreground">{s.value}</p>
                    {s.dateObserved && (
                      <p className="mt-1 text-[10px] text-muted-foreground/70">{s.dateObserved}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PortfolioCompany() {
  const [, params] = useRoute("/:firmSlug/portfolio/:companyId");
  const firmSlug = params?.firmSlug ?? "";
  const isRaviga = firmSlug === "raviga";
  const isDogfood = firmSlug === "cs-rescue-internal";
  // Anonymized BackEngine evidence — dogfood tenant only; the query never
  // fires for any other firm, so every other tenant renders unchanged.
  const { data: backengineData } = useGetCsRescueInternalBackengine({
    query: { queryKey: getGetCsRescueInternalBackengineQueryKey(), enabled: isDogfood },
  });
  // DB-backed structured evidence signals — Raviga demo tenant only. The
  // query never fires for any other firm (enabled: isRaviga), so
  // stg/pamlico/longarc/solen make zero extra requests and render unchanged.
  const { data: diagnosticData } = useGetRavigaSignals({
    query: { queryKey: getGetRavigaSignalsQueryKey(), enabled: isRaviga },
  });
  const firm = getFirm(firmSlug);

  if (!firm) return <FirmNotFound />;

  const company = params?.companyId ? getFirmCompany(firmSlug, params.companyId) : undefined;
  if (!company) return <CompanyNotFound firm={firm} />;

  const { tier } = company;
  const bandMeta = rubricBandMeta(company.rubric.portcoScore);
  const idPillars = RUBRIC_PILLARS.filter(
    (p) => company.rubric[p.key] === "Insufficient Data",
  ).length;
  const allCompanies = isRaviga ? getFirmCompanies(firmSlug) : [];
  // Company.id IS the portal slug (companies.slug), which is exactly what the
  // signals endpoint keys companySlug on.
  const companySignals: SignalRecord[] = isRaviga
    ? (diagnosticData?.signals ?? []).filter((s) => s.companySlug === company.id)
    : [];
  return (
    <TenantShell firm={firm}>
      {isRaviga && allCompanies.length > 1 && (
        <div className="mb-5">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {allCompanies.map((c) => (
              <Link
                key={c.id}
                href={`/${firm.slug}/portfolio/${c.id}`}
                className={`flex-none flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap font-medium transition-colors ${
                  c.id === company.id
                    ? "border-[#2d4a6e] bg-[#2d4a6e] text-white"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: rubricBandMeta(c.rubric.portcoScore).color }}
                />
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      <Link
        href={`/${firm.slug}/portfolio`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Portfolio
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <PortcoScoreRing company={company} />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{company.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{company.sector}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${bandMeta.badgeClass}`}
                >
                  PortCo Score · {company.rubric.portcoScore}
                </span>
                <ConfidenceBadge confidence={company.confidence} />
                <IcpEligibilityChip company={company} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-2">
            <Meta icon={Building2} label="ARR" value={company.arrDisplay} />
            <Meta icon={MapPin} label="HQ" value={company.hq} />
            <Meta icon={Users} label="Headcount" value={company.employeesDisplay} />
            <Meta icon={CalendarClock} label="Last assessed" value={formatDate(company.lastDiagnostic)} />
            {isRaviga &&
              (() => {
                const { nrr, grr } = getRetentionMetrics(company);
                return (
                  <>
                    <Meta icon={Percent} label="NRR" value={`${nrr}%`} />
                    <Meta icon={Percent} label="GRR" value={`${grr}%`} />
                  </>
                );
              })()}
          </div>
        </div>
        <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">{company.summary}</p>
        {idPillars > 0 &&
          (isRaviga ? (
            <p
              title={`${idPillars} of 4 pillars marked Insufficient Data from external signals; scored pillars drive the rating.`}
              className="mt-3 flex cursor-help items-center gap-1.5 text-[11px] text-amber-300/80"
            >
              <Info className="h-3 w-3 shrink-0" />
              {idPillars} of 4 pillars Insufficient Data
            </p>
          ) : (
            <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-300/90">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {idPillars} of 4 pillars marked <span className="font-medium">Insufficient Data</span>: not
              enough external signal to rate; scored pillars drive the PortCo Score.
            </p>
          ))}
      </div>

      {/* Recommendation band */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recommended engagement
          </div>
          <p className="mt-2 text-sm text-foreground">{company.engagement}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">INVESQ signal</div>
          <p className="mt-2 text-sm text-foreground">{company.invesqSignal}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Est. ARR at risk
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold" style={{ color: tier.color }}>
            {company.arrAtRiskDisplay}
          </div>
          <div className="text-[11px] text-amber-600">
            {company.arrAtRiskRange
              ? `Illustrative · ${tier.arrRisk} · typical exposure at this diagnostic level`
              : `ARR undisclosed · ${tier.arrRisk} · typical exposure at this diagnostic level`}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pillar breakdown */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">4-pillar scorecard</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Each pillar rated Low / Medium / High from external signals
              </p>
            </div>
            {isRaviga && <PillarMethodologyDrawer />}
          </div>
          <div className="mt-4 space-y-4">
            {RUBRIC_PILLARS.map((p) => {
              const value = company.rubric[p.key];
              const meta = rubricBandMeta(value);
              const pillarSignals = isRaviga
                ? companySignals.filter((s) => p.sourcePillarIds.includes(s.pillarId))
                : [];
              return (
                <div key={p.key} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className={`text-xs font-medium ${meta.textClass}`}>{meta.label}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full rounded-full ${meta.barClass} ${
                        value === "Insufficient Data" ? "opacity-40" : ""
                      }`}
                      style={{ width: `${meta.fillPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{p.measures}</p>
                  {pillarSignals.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      {pillarSignals.map((s) => (
                        <DiagnosticSignalCard key={s.id} signal={s} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {isRaviga &&
              (() => {
                const mapped = new Set(RUBRIC_PILLARS.flatMap((p) => [...p.sourcePillarIds]));
                const extra = companySignals.filter((s) => !mapped.has(s.pillarId));
                if (extra.length === 0) return null;
                return (
                  <div className="pt-1">
                    <div className="text-xs font-medium text-foreground">Additional diagnostic signals</div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Evidence observed outside the four rubric pillars.
                    </p>
                    <div className="mt-2.5 space-y-2">
                      {extra.map((s) => (
                        <DiagnosticSignalCard key={s.id} signal={s} />
                      ))}
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>

        {/* Right rail: gaps + trend */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingDown className="h-4 w-4 text-rose-400" /> Priority gaps
            </h2>
            <div className="mt-3 space-y-3">
              {company.gaps.slice(0, 3).map((g) => (
                <div key={g.pillar.id} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{gapTitle(company, g)}</span>
                    <span className={`text-[11px] font-medium ${scoreLevel(g.score).textClass}`}>
                      {scoreLevel(g.score).label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{g.note}</p>
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
                <div className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">CS Leadership</span>
                    <span className={`text-[11px] font-medium ${scoreLevel(null).textClass}`}>
                      {scoreLevel(null).label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{company.gapNotes.leadership}</p>
                </div>
              )}
            </div>
          </div>

          {isRaviga && <RecommendedPlaybooksCard company={company} />}

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">PortCo Score trend</h2>
            </div>
            <div className="mt-3">
              {company.assessmentPoints.some((p) => p.displayMax > 0) ? (
                <TrendChart company={company} />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
                  Insufficient Data — trend builds once pillars are scored
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {company.assessmentPoints.length === 1
                ? "1 assessment on record; trend builds as diagnostics re-run"
                : `${company.assessmentPoints.length} assessments on record`}
            </p>
          </div>
        </div>
      </div>

      {/* Anonymized BackEngine evidence — dogfood tenant only */}
      {isDogfood && backengineData && <BackengineEvidenceSection data={backengineData} />}

      {/* Phase 2 integrations */}
      <Phase2Integrations company={company} isRaviga={isRaviga} />

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Prepared for {firm.displayName} · as of {formatDate(AS_OF_DATE)} · Design-partner preview
      </p>
      <section id="diagnostic-report" className="scroll-mt-4">
        <PortcoReportWorkflow firmSlug={firmSlug} companySlug={params?.companyId ?? ""} />
      </section>
    </TenantShell>
  );
}

import { useState } from "react";
import { useRoute, Redirect } from "wouter";
import { Plug, ShieldCheck, Database, CheckCircle2 } from "lucide-react";
import {
  getFirm,
  getFirmCompanies,
  getFirmConnectorSummary,
  GOVERNANCE_MATRIX,
  SEMANTIC_LAYER,
  type ConnectorFirmSummary,
} from "@/data/portfolio";
import { TenantShell } from "@/components/portfolio/TenantShell";

type Tab = "connectors" | "governance" | "semantic";

// ---------------------------------------------------------------------------
// Connectors tab
// ---------------------------------------------------------------------------
function ConnectorsTab({ summary }: { summary: ConnectorFirmSummary[] }) {
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Simulated connections aggregated across the portfolio. In a real Phase 2 engagement these
        pull live records from each source system on the cadence shown below.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{c.displayName}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            </div>
            <div className="mt-3 space-y-1">
              <div className="text-[11px] text-muted-foreground">
                {c.recordCount.toLocaleString()} records synced
              </div>
              <div className="text-[11px] text-muted-foreground">
                Last synced {c.lastSyncedMinutesAgo}m ago
              </div>
            </div>
            <div className="mt-2 text-[10px] italic text-amber-500/80">
              Simulated connection — demo environment
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Governance tab
// ---------------------------------------------------------------------------
const CLASSIFICATION_STYLES: Record<string, string> = {
  Public: "border-slate-300 bg-slate-100 text-slate-700",
  Internal: "border-sky-300 bg-sky-100 text-sky-800",
  Confidential: "border-amber-300 bg-amber-100 text-amber-800",
  Restricted: "border-rose-300 bg-rose-100 text-rose-800",
};

function GovernanceTab() {
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Data classification, ownership, and retention policy for each connected domain.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Domain</th>
              <th className="py-2 pr-4 font-medium">Owner</th>
              <th className="py-2 pr-4 font-medium">Classification</th>
              <th className="py-2 pr-4 font-medium">Retention</th>
              <th className="py-2 font-medium">Last reviewed</th>
            </tr>
          </thead>
          <tbody>
            {GOVERNANCE_MATRIX.map((row) => (
              <tr key={row.domain} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-4 font-medium text-foreground">{row.domain}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">{row.owner}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${CLASSIFICATION_STYLES[row.classification]}`}
                  >
                    {row.classification}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">{row.retention}</td>
                <td className="py-2.5 text-muted-foreground">{row.lastReviewed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Semantic layer tab
// ---------------------------------------------------------------------------
function SemanticTab() {
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Modeled entities exposed to the diagnostics engine once source systems are connected.
      </p>
      <div className="space-y-3">
        {SEMANTIC_LAYER.map((entity) => (
          <div key={entity.name} className="rounded-lg border border-border bg-background/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="text-sm font-semibold text-foreground">{entity.name}</code>
              <span className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                {entity.grain}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{entity.description}</p>
            <div className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
              Source: {entity.sourceSystem}
            </div>
          </div>
        ))}
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

export default function RavigaDataSources() {
  const [, params] = useRoute("/:firmSlug/data-sources");
  const firmSlug = params?.firmSlug ?? "";
  const firm = getFirm(firmSlug);
  const [tab, setTab] = useState<Tab>("connectors");

  if (!firm) return <FirmNotFound />;

  // Data Sources is a Raviga-only sandbox surface (live-data demo feature);
  // every other tenant is redirected back to its portfolio overview.
  if (firmSlug !== "raviga") {
    return <Redirect to={`/${firmSlug}/portfolio`} />;
  }

  const companies = getFirmCompanies(firmSlug);
  const connectorSummary = getFirmConnectorSummary(companies);

  const tabs: { id: Tab; label: string; icon: typeof Plug }[] = [
    { id: "connectors", label: "Connectors", icon: Plug },
    { id: "governance", label: "Governance", icon: ShieldCheck },
    { id: "semantic", label: "Semantic Layer", icon: Database },
  ];

  return (
    <TenantShell firm={firm}>
      {/* Eyebrow + title */}
      <div className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {firm.displayName.toUpperCase()} · Fund III
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Data Sources</h1>
          <p className="text-sm text-muted-foreground">
            Simulated Phase 2 connected-data infrastructure for this design-partner preview
          </p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="mb-1 flex items-center gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {tab === "connectors" && <ConnectorsTab summary={connectorSummary} />}
        {tab === "governance" && <GovernanceTab />}
        {tab === "semantic" && <SemanticTab />}
      </div>

      <p className="mt-3 text-[11px] italic text-amber-600/70">
        Simulated connection — demo environment. Illustrative of the data infrastructure a Phase 2
        engagement would stand up.
      </p>
    </TenantShell>
  );
}

import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { AlertTriangle, ArrowRight, Building2 } from "lucide-react";
import {
  getFirm,
  getFirmCompanies,
  gapTitle,
  type Company,
  type GapItem,
} from "@/data/portfolio";
import { RavigaShell } from "@/components/portfolio/RavigaShell";

type Severity = "All" | "High" | "Medium";

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

  const companies = getFirmCompanies(firmSlug);
  const allFindings = useMemo(() => buildFindings(companies), [companies]);

  const [severity, setSeverity] = useState<Severity>("All");

  const filtered =
    severity === "All" ? allFindings : allFindings.filter((f) => f.severity === severity);

  const highCount = allFindings.filter((f) => f.severity === "High").length;
  const medCount = allFindings.filter((f) => f.severity === "Medium").length;

  return (
    <RavigaShell firm={firm}>
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

      <div className="mt-8 border-t border-border pt-4 text-[11px] text-muted-foreground/50">
        All findings are based on Phase 1 external-signal diagnostics (LinkedIn, G2/Capterra, job
        postings, press). Phase 2 engagement validates with proprietary CRM, Gainsight, and product
        data.
      </div>
    </RavigaShell>
  );
}

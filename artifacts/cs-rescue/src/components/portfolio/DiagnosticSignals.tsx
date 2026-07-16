// ---------------------------------------------------------------------------
// Diagnostic Signals — shared presentational pieces for the DB-backed
// structured evidence records (the `signals` table), rendered ONLY on
// Raviga-gated surfaces (/raviga/findings and /raviga/portfolio/:companySlug).
//
// These are Phase 1 diagnostic evidence records captured during pipeline
// scoring — distinct from ravigaLiveData.ts's simulated "Live Signals" feed,
// which stays untouched. Signals are evidence metadata only and never feed
// composite/tier/denominator math.
//
// This file must only ever be imported from Raviga-gated call sites
// (isRaviga / firmSlug === "raviga" checks at the call site). It is never
// imported by stg/pamlico/longarc/solen render paths.
// ---------------------------------------------------------------------------
import { ExternalLink, Building2 } from "lucide-react";
import { Link } from "wouter";
import type { SignalRecord } from "@workspace/api-client-react";

const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  job_posting: "Job posting",
  g2_capterra: "G2 / Capterra",
  press: "Press",
  crunchbase: "Crunchbase",
  pitchbook: "PitchBook",
  company_site: "Company site",
  other: "Other source",
};

export function signalSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? SOURCE_LABELS.other;
}

const DIRECTION_STYLES: Record<string, string> = {
  positive: "border-emerald-300 bg-emerald-100 text-emerald-800",
  negative: "border-rose-300 bg-rose-100 text-rose-800",
  neutral: "border-slate-300 bg-slate-100 text-slate-700",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  High: "border-emerald-300 text-emerald-700",
  Medium: "border-amber-300 text-amber-700",
  Low: "border-slate-300 text-slate-600",
};

export function DiagnosticSignalCard({
  signal,
  companyName,
  companyHref,
}: {
  signal: SignalRecord;
  // Optional company attribution (used on the firm-wide findings page; the
  // company detail page omits it because the context is already the company).
  companyName?: string;
  companyHref?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium capitalize ${
            DIRECTION_STYLES[signal.direction] ?? DIRECTION_STYLES.neutral
          }`}
        >
          {signal.direction}
        </span>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
            CONFIDENCE_STYLES[signal.confidence] ?? CONFIDENCE_STYLES.Low
          }`}
        >
          {signal.confidence} confidence
        </span>
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {signalSourceLabel(signal.source)}
        </span>
        {signal.dateObserved && (
          <span className="text-[10px] text-muted-foreground/70">{signal.dateObserved}</span>
        )}
        {companyName && (
          <span className="ml-auto flex items-center gap-1">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            {companyHref ? (
              <Link
                href={companyHref}
                className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
              >
                {companyName}
              </Link>
            ) : (
              <span className="text-[11px] text-muted-foreground">{companyName}</span>
            )}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{signal.note}</p>
      {signal.url && (
        <a
          href={signal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary/70 transition-colors hover:text-primary"
        >
          <ExternalLink className="h-3 w-3" /> Source link
        </a>
      )}
    </div>
  );
}

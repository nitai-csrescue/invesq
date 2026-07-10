import { useRoute, Link } from "wouter";
import { ArrowLeft, CheckCircle2, Clock, User2, AlertTriangle, CalendarClock, TrendingUp } from "lucide-react";
import {
  getFirm,
  getFirmCompany,
  gapTitle,
  formatDate,
  type Company,
  type GapItem,
} from "@/data/portfolio";
import { TenantShell } from "@/components/portfolio/TenantShell";

// ---------------------------------------------------------------------------
// Deterministic mappings from pillar → role + imperative action
// ---------------------------------------------------------------------------
const OWNER_MAP: Record<string, string> = {
  org: "CS Leader",
  onboarding: "Onboarding Lead",
  health: "CS Operations",
  escalation: "CSM Team Lead",
  revenue: "RevOps / Account Management",
  leadership: "Talent & Operating Partners",
  planning: "Senior CSMs",
  ai: "CS Operations",
};

const ACTION_MAP: Record<string, string> = {
  org: "Establish a distinct CS org with clear role separation across CSM, onboarding, and support",
  onboarding: "Build and deploy a repeatable, structured onboarding program that drives early time-to-value",
  health: "Implement systematic health scoring and early-warning signals across the book of business",
  escalation: "Launch a proactive at-risk account management and escalation playbook",
  revenue: "Install a structured revenue motion with explicit NRR ownership and expansion quotas",
  leadership: "Hire or appoint a senior CS leader with a value-creation mandate and clear P&L accountability",
  planning: "Launch a formal account planning cadence with QBRs on high-value accounts",
  ai: "Integrate AI workflows into core CS motions to scale coverage without proportional headcount",
};

const DAY_MILESTONES = [20, 40, 60, 90, 100];
const getDay = (i: number) => DAY_MILESTONES[i] ?? 100 + (i - 4) * 20;

// ---------------------------------------------------------------------------
// Generate gameplan items from company gaps (already sorted by weakness)
// ---------------------------------------------------------------------------
function generateItems(company: Company) {
  return company.gaps.slice(0, 5).map((gap, i) => ({
    day: getDay(i),
    pillarId: gap.pillar.id,
    title: gapTitle(company, gap),
    action: ACTION_MAP[gap.pillar.id] ?? `Close the ${gap.pillar.name.toLowerCase()} gap`,
    finding: gap.note,
    owner: OWNER_MAP[gap.pillar.id] ?? "CS Leader",
    priority: (gap.score === 0 ? "High" : "Medium") as "High" | "Medium",
    peValue: gap.pillar.peValue,
    gap,
  }));
}

// ---------------------------------------------------------------------------
// Priority badge
// ---------------------------------------------------------------------------
function PriorityBadge({ priority }: { priority: "High" | "Medium" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        priority === "High"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
      }`}
    >
      {priority === "High" ? (
        <AlertTriangle className="h-2.5 w-2.5" />
      ) : (
        <Clock className="h-2.5 w-2.5" />
      )}
      {priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Timeline item card
// ---------------------------------------------------------------------------
function GameplanItem({
  item,
  isLast,
}: {
  item: ReturnType<typeof generateItems>[number];
  isLast: boolean;
}) {
  return (
    <div className="flex gap-5">
      {/* Stem */}
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 flex-none flex-col items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-primary">
          <span className="text-[8px] font-semibold leading-none text-primary/70">Day</span>
          <span className="text-[11px] font-bold leading-none">{item.day}</span>
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
      </div>

      {/* Card */}
      <div className={`flex-1 rounded-xl border border-border bg-card p-4 ${isLast ? "" : "mb-6"}`}>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          <PriorityBadge priority={item.priority} />
        </div>

        <p className="mb-3 text-sm text-foreground/90 leading-relaxed">{item.action}</p>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>
              <span className="font-medium text-foreground/70">Gap: </span>
              {item.finding}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User2 className="h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-medium text-foreground/70">Owner: </span>
              {item.owner}
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span>
              <span className="font-medium text-foreground/70">PE value: </span>
              {item.peValue}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not-found stubs
// ---------------------------------------------------------------------------
function FirmNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-muted-foreground">Firm not found.</p>
    </div>
  );
}
function CompanyNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-muted-foreground">Company not found.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function RavigaGameplan() {
  const [, params] = useRoute("/:firmSlug/portfolio/:companyId/gameplan");
  const firmSlug = params?.firmSlug ?? "";
  const firm = getFirm(firmSlug);
  if (!firm) return <FirmNotFound />;

  const company = params?.companyId ? getFirmCompany(firmSlug, params.companyId) : undefined;
  if (!company) return <CompanyNotFound />;

  const items = generateItems(company);

  return (
    <TenantShell firm={firm}>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link
          href={`/${firm.slug}/portfolio/${company.id}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {company.name}
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground">100-Day Gameplan</span>
      </div>

      {/* Company header card */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{company.name} — 100-Day Gameplan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {company.sector} · {company.hq}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${company.tier.badgeClass}`}
            >
              Tier {company.tier.id} · {company.tier.label}
            </span>
            <span className="font-mono text-sm text-muted-foreground">
              {company.displayMax > 0 ? `${company.composite}/${company.displayMax}` : "N/A"}
            </span>
          </div>
        </div>
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
          {company.engagement}
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          <CalendarClock className="h-3.5 w-3.5" />
          Diagnostic as of {formatDate(company.lastDiagnostic)} · Phase 1 external signals ·{" "}
          {items.length} milestone{items.length !== 1 ? "s" : ""} identified
        </div>
      </div>

      {/* Disclaimer footnote */}
      <p className="mb-6 text-[11px] italic text-muted-foreground/60">
        Generated from Phase 1 external-signal diagnostics. Milestones are directional — actual sequencing
        depends on leadership alignment and resource availability. Phase 2 engagement validates and refines priorities.
      </p>

      {/* Timeline */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No open gaps identified — {company.name} is performing well across all assessed pillars.
        </div>
      ) : (
        <div>
          {items.map((item, i) => (
            <GameplanItem key={item.pillarId} item={item} isLast={i === items.length - 1} />
          ))}
        </div>
      )}

      {/* CTA — full report */}
      {items.length > 0 && (
        <div className="mt-8 flex items-center gap-3">
          <Link
            href={`/${firm.slug}/portfolio/${company.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to full report
          </Link>
          <Link
            href={`/${firm.slug}/findings`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/20"
          >
            View all portfolio findings <TrendingUp className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="mt-8 border-t border-border pt-4 text-[11px] text-muted-foreground/50">
        Gameplan derived from {company.name}'s Phase 1 composite (Tier {company.tier.id},{" "}
        {company.displayMax > 0 ? `${company.composite}/${company.displayMax}` : "N/A"}). Source:
        Diagnostic assessment{" "}
        {formatDate(company.lastDiagnostic)}. Not a guarantee of outcomes.
      </div>
    </TenantShell>
  );
}

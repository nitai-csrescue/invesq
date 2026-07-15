import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Database,
  Brain,
  UserCheck,
  FileText,
  Rocket,
  Building2,
  AlertTriangle,
  Workflow,
  Activity,
  TrendingDown,
  UserMinus,
  GitBranch,
  ServerCrash,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * INVESQ Overview / Investor Brief.
 *
 * This is a PE/VC-facing page — it must read like an operational diligence
 * pitch, not a generic AI/SaaS dashboard story. Sections are named for
 * what investors care about (the diligence gap, what we detect, who we
 * serve, value creation), not generic "Problem / Insight / Shift".
 */

const GAP_POINTS = [
  "Lower mid-market and growth equity firms lack the operational infrastructure to independently validate management-reported metrics.",
  "Traditional diligence relies on curated VDRs, spreadsheets, and management presentations that obscure underlying customer and operational issues.",
  "Post-close, funds are routinely surprised by churn, implementation failures, weak adoption, revenue concentration, and operational scalability gaps.",
];

const WORKFLOW = [
  { Icon: Building2, title: "Enterprise Systems", body: "CRM, support, comms, BI, customer success." },
  { Icon: Database, title: "Data Ingestion", body: "Structured and unstructured signals, normalized." },
  { Icon: Brain, title: "AI Risk Analysis", body: "Reconstruct the real customer journey." },
  { Icon: UserCheck, title: "Human Validation", body: "Operator review, with full audit trail." },
  { Icon: FileText, title: "Executive Risk Report", body: "Streamlined, board-ready output." },
  { Icon: Rocket, title: "100-Day Value Plan", body: "Concrete post-close execution priorities." },
];

const DETECT = [
  {
    Icon: TrendingDown,
    title: "Hidden churn indicators",
    body: "Usage cliffs, lapsed champions, and support escalations that don't show up in management reporting.",
  },
  {
    Icon: UserMinus,
    title: "Founder & key-person dependency",
    body: "Concentration of customer relationships, decisions, or knowledge in a small number of named individuals.",
  },
  {
    Icon: ServerCrash,
    title: "Operational fragility",
    body: "Brittle handoffs, manual processes, and integration gaps that don't scale with the next stage of growth.",
  },
  {
    Icon: GitBranch,
    title: "Adoption & journey gaps",
    body: "Implementation drag, low feature uptake, and broken onboarding paths in the actual customer base.",
  },
  {
    Icon: AlertTriangle,
    title: "Revenue concentration risk",
    body: "Customer cohorts, segments, or accounts where the reported metric hides material exposure.",
  },
  {
    Icon: Activity,
    title: "Reporting vs. reality drift",
    body: "Quantified gap between management-reported KPIs and what the underlying systems actually show.",
  },
];

const PILLARS = [
  {
    Icon: AlertTriangle,
    title: "Automated Risk Discovery",
    body: "Detect hidden churn indicators, operational fragility, and founder dependency using real system activity — not curated reporting.",
  },
  {
    Icon: Workflow,
    title: "Actionable Value Creation",
    body: "Translate diligence findings into post-close execution priorities the operating partner can run from day one.",
  },
  {
    Icon: Activity,
    title: "Continuous Integrity Monitoring",
    body: "Track customer and operational health from diligence through hold period to exit readiness.",
  },
];

const ICP = [
  {
    tier: "Lean Growth Funds",
    aum: "$100M – $500M AUM",
    body: "Small teams, limited operations resources. Need lightweight diligence and executive-level risk visibility without standing up a 10-person ops practice.",
  },
  {
    tier: "Scaling Mid-Market Funds",
    aum: "$500M – $2B AUM",
    body: "Growing portfolio complexity. Need post-close planning and operational visibility across more deals than a manual diligence motion can support.",
  },
];

const QUESTIONS = [
  "Where does management-reported data diverge from operational reality?",
  "What hidden customer journey risks could affect retention, growth, or exit multiple?",
  "What should the fund prioritize in the first 100 days post-close?",
];

export default function Overview() {
  return (
    <div className="min-h-screen px-6 py-10" data-testid="overview-page">
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-10">
        <Link href="/" className="text-slate-300 hover:text-white inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to executive brief
        </Link>
        <Button asChild size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-1.5">
          <Link href="/dashboard">Preview sample risk report <ArrowRight className="w-3.5 h-3.5" /></Link>
        </Button>
      </header>

      <main className="max-w-5xl mx-auto space-y-12">
        {/* Hero */}
        <section className="text-center pt-2">
          <Badge variant="outline" className="text-cyan-300 border-cyan-400/30 mb-4">
            INVESQ · For PE Firms and Portfolio Companies
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Operational Due Diligence{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              for the Customer Journey
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-300 mt-5 max-w-3xl mx-auto leading-relaxed">
            INVESQ helps PE and VC firms validate management narratives by analyzing real customer, support,
            CRM, and communication signals before capital is committed.
          </p>
          <p className="text-xs text-slate-500 mt-3 max-w-2xl mx-auto italic">
            An Operational Intelligence Layer that gives investors the ground truth behind the customer
            journey.
          </p>
        </section>

        {/* The Operational Diligence Gap */}
        <section
          className="rounded-2xl border border-white/10 bg-slate-950/40 p-7 md:p-9"
          data-testid="overview-section-gap"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2">
            The Operational Diligence Gap
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-5 leading-tight">
            Diligence still depends on what management chooses to show.
          </h2>
          <ul className="space-y-3">
            {GAP_POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-slate-300 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2.5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* How INVESQ Works — 6-step workflow */}
        <section data-testid="overview-section-how">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2 text-center">
            How INVESQ Works
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6 leading-tight">
            From enterprise systems to a 100-day value creation plan.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {WORKFLOW.map((step, idx) => (
              <div
                key={step.title}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-5 relative hover:border-cyan-400/30 transition-colors"
                data-testid={`workflow-step-${idx}`}
              >
                <span className="absolute top-3 right-3 text-[10px] font-mono text-slate-600">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-3">
                  <step.Icon className="w-4 h-4 text-cyan-300" />
                </div>
                <p className="text-sm font-semibold text-white">{step.title}</p>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="hidden lg:flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500 mt-5">
            <span>Pre-close diligence</span>
            <ArrowRight className="w-3 h-3" />
            <span className="text-cyan-300">Post-close execution</span>
          </div>
        </section>

        {/* What We Detect */}
        <section data-testid="overview-section-detect">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2 text-center">
            What We Detect
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6 leading-tight">
            The risks that don't show up in the data room.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DETECT.map((d) => (
              <div
                key={d.title}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-5 hover:border-amber-400/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mb-3">
                  <d.Icon className="w-4 h-4 text-amber-300" />
                </div>
                <p className="text-sm font-semibold text-white">{d.title}</p>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Core Pillars */}
        <section data-testid="overview-section-pillars">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2 text-center">
            From Risk Detection to Value Creation
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6 leading-tight">
            What INVESQ delivers across the investment lifecycle.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-6 hover:border-cyan-400/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-3">
                  <p.Icon className="w-5 h-5 text-cyan-300" />
                </div>
                <p className="text-base font-semibold text-white">{p.title}</p>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who We Serve */}
        <section data-testid="overview-section-icp">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2 text-center">
            Who We Serve
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6 leading-tight">
            Built for funds that can't carry a 10-person ops practice.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ICP.map((seg) => (
              <div
                key={seg.tier}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-6 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">{seg.tier}</p>
                  <p className="text-xs text-cyan-300/80 font-mono mt-0.5">{seg.aum}</p>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">{seg.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Strategic framing — investor questions */}
        <section
          className="rounded-2xl border border-white/10 bg-slate-950/40 p-7 md:p-9"
          data-testid="overview-section-questions"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2">
            Three Questions Every Deal Team Should Ask
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-5 leading-tight">
            INVESQ exists to answer these — with system-level evidence.
          </h2>
          <ul className="space-y-3">
            {QUESTIONS.map((q, i) => (
              <li
                key={q}
                className="flex items-start gap-3 text-slate-200 leading-relaxed"
              >
                <span className="w-7 h-7 rounded-md bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0 text-cyan-300 text-[11px] font-mono font-bold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 pt-0.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500 inline-block mr-2 -mt-0.5" />
                  <span>{q}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-9 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white">
            See INVESQ run on a sample portfolio company.
          </h3>
          <p className="text-sm text-slate-300 mt-2 max-w-xl mx-auto">
            Walk through a live operational risk assessment — from data ingestion to executive output and
            100-day value creation plan.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 mt-5">
            <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2">
              <Link href="/dashboard">Preview sample risk report <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard">Request a diligence walkthrough</Link>
            </Button>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-600 pt-6 pb-4">
          © 2026 INVESQ · Operational Due Diligence Platform
        </footer>
      </main>
    </div>
  );
}

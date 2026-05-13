import { Link } from "wouter";
import {
  ArrowRight,
  ShieldCheck,
  Database,
  Brain,
  AlertTriangle,
  Workflow,
  TrendingUp,
  Activity,
  Building2,
  Users,
  Eye,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PROBLEMS = [
  "Lower mid-market and growth equity firms lack the operational infrastructure to independently validate management-reported metrics.",
  "Traditional diligence relies on curated VDRs, spreadsheets, and management presentations that obscure underlying customer and operational issues.",
  "The result: post-close surprises tied to churn, implementation failures, poor adoption, revenue concentration, and operational scalability.",
];

const PILLARS = [
  {
    Icon: AlertTriangle,
    title: "Automated Risk Discovery",
    body: "Detect hidden churn, founder dependency, and operational fragility from real system activity — not curated reporting.",
  },
  {
    Icon: Workflow,
    title: "Actionable Insights",
    body: "Translate operational findings into value-creation plans that can be operationalized immediately post-close.",
  },
  {
    Icon: Activity,
    title: "Continuous Integrity Monitoring",
    body: "Maintain an audit trail of customer health and operational performance across the full investment lifecycle.",
  },
];

const ICP = [
  {
    tier: "Lean Growth Funds",
    aum: "$100M – $500M AUM",
    body: "Small teams without dedicated operations partners that need lightweight operational diligence and executive-level risk visibility.",
  },
  {
    tier: "Scaling Mid-Market Funds",
    aum: "$500M – $2B AUM",
    body: "Firms with growing operational complexity that require deeper customer-journey analysis, post-close planning, and system-level validation.",
  },
];

const TEAM = [
  {
    name: "Jay Fox",
    role: "Co-Founder",
    body: "20+ years building GTM organizations at PE- and VC-backed technology companies. Previously led a 30+ person global Client Success org at TRG Screen prior to its acquisition by Vista Equity Partners.",
  },
  {
    name: "Nitai Vinitzky",
    role: "Co-Founder",
    body: "10+ years leading enterprise SaaS implementations, integrations, and deployment strategy across fintech and compliance organizations including Nova Credit, Hearsay Systems, and iCIMS.",
  },
];

const DISCUSSION = [
  "How frequently does management-reported data materially diverge from operational reality?",
  "What level of operational transparency are portfolio companies willing to provide during competitive diligence?",
  "Is the greatest value derived from risk mitigation at entry, or accelerated value creation post-close?",
  "Should INVESQ extend beyond diligence into ongoing portfolio monitoring and exit readiness?",
];

const PIPELINE = [
  {
    Icon: Database,
    title: "Data Ingestion",
    body: "CRM, support, comms, BI, customer success, and warehouse — structured and unstructured.",
  },
  {
    Icon: Brain,
    title: "AI Analysis",
    body: "Reconstruct the real customer journey and surface discrepancies between reported and actual.",
  },
  {
    Icon: ShieldCheck,
    title: "Risk Output",
    body: "Executive-grade risk assessment paired with concrete value-creation recommendations.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen px-6 py-8" data-testid="landing-page">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <p className="font-bold text-lg text-white tracking-tight">INVESQ</p>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
            <Link href="/overview">Investor pitch</Link>
          </Button>
          <Button asChild size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-1.5">
            <Link href="/dashboard" data-testid="cta-launch-app">
              See the platform <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto space-y-12">
        {/* Hero / Executive Summary */}
        <section className="text-center pt-2">
          <Badge variant="outline" className="text-cyan-300 border-cyan-400/30 mb-4">
            Executive Brief
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Reimagining{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              Operational Due Diligence
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-300 mt-5 max-w-3xl mx-auto leading-relaxed">
            INVESQ provides Private Equity and Venture Capital firms with an automated{" "}
            <span className="text-white font-semibold">Ground Truth</span> layer that reconstructs the real
            customer journey across fragmented enterprise systems — uncovering operational risk before capital
            is committed.
          </p>
          <p className="text-sm text-slate-400 mt-3 max-w-3xl mx-auto leading-relaxed">
            Validate management narratives with system-level evidence. Identify hidden churn risk, founder
            dependency, operational bottlenecks, customer adoption gaps, and scalability constraints that are
            typically invisible during traditional diligence.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 mt-7">
            <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2">
              <Link href="/dashboard">Explore a sample assessment <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/overview">Read the long-form pitch</Link>
            </Button>
          </div>
        </section>

        {/* Market Problem */}
        <section
          className="rounded-2xl border border-white/10 bg-slate-950/40 p-7 md:p-9"
          data-testid="brief-market-problem"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2">
            Market Problem
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-5 leading-tight">
            Diligence still depends on what management chooses to show.
          </h2>
          <ul className="space-y-3">
            {PROBLEMS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-slate-300 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2.5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Proposed Solution + Pipeline diagram */}
        <section
          className="rounded-2xl border border-white/10 bg-slate-950/40 p-7 md:p-9"
          data-testid="brief-solution"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2">
            Proposed Solution
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-5 leading-tight">
            One operational risk profile, built from real system activity.
          </h2>
          <p className="text-slate-300 leading-relaxed">
            INVESQ ingests structured and unstructured data from CRMs, support systems, communication
            platforms, BI tools, and customer success platforms — building a unified operational risk profile.
            AI-assisted analysis identifies discrepancies between reported metrics and operational reality,
            producing a streamlined executive-level risk assessment paired with actionable value-creation
            recommendations for both diligence and post-close execution.
          </p>

          {/* Pipeline diagram */}
          <div className="mt-7 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 md:gap-2 items-stretch">
            {PIPELINE.flatMap((step, idx) => {
              const card = (
                <div
                  key={step.title}
                  className="rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 p-5"
                  data-testid={`pipeline-step-${idx}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center mb-3">
                    <step.Icon className="w-4 h-4 text-cyan-200" />
                  </div>
                  <p className="text-sm font-bold text-white tracking-tight">{step.title}</p>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{step.body}</p>
                </div>
              );
              if (idx === PIPELINE.length - 1) return [card];
              return [
                card,
                <div
                  key={`arrow-${idx}`}
                  className="flex md:items-center justify-center text-cyan-400/60"
                  aria-hidden
                >
                  <ArrowRight className="w-5 h-5 hidden md:block" />
                  <ArrowDown className="w-5 h-5 md:hidden" />
                </div>,
              ];
            })}
          </div>
        </section>

        {/* Core Product Pillars */}
        <section data-testid="brief-pillars">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2 text-center">
            Core Product Pillars
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6 leading-tight">
            What INVESQ delivers.
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

        {/* Target ICP */}
        <section data-testid="brief-icp">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2 text-center">
            Target ICP Segments
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6 leading-tight">
            Who we serve.
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

        {/* Founding Team */}
        <section data-testid="brief-team">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2 text-center">
            Founding Team
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6 leading-tight">
            Operators who've lived this problem.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-6 flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">{m.name}</p>
                  <p className="text-xs text-cyan-300 mt-0.5">{m.role}</p>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Strategic Discussion Points */}
        <section
          className="rounded-2xl border border-white/10 bg-slate-950/40 p-7 md:p-9"
          data-testid="brief-discussion"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-2">
            Strategic Discussion Points
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-5 leading-tight">
            Open questions for our partners.
          </h2>
          <ul className="space-y-3">
            {DISCUSSION.map((q, i) => (
              <li
                key={q}
                className="flex items-start gap-3 text-slate-300 leading-relaxed"
              >
                <span className="text-cyan-300 font-mono text-xs mt-0.5 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-9 text-center">
          <TrendingUp className="w-8 h-8 text-cyan-300 mx-auto mb-3" />
          <h3 className="text-2xl md:text-3xl font-bold text-white">
            See INVESQ run on a sample portfolio company.
          </h3>
          <p className="text-sm text-slate-300 mt-2 max-w-xl mx-auto">
            Step through a live operational risk assessment — from data ingestion to executive output.
          </p>
          <Button asChild size="lg" className="mt-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2">
            <Link href="/dashboard" data-testid="cta-footer-launch">
              Open the platform <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </section>

        <footer className="text-center text-xs text-slate-600 pt-6 pb-4">
          © 2026 INVESQ · Operational Due Diligence Platform
        </footer>
      </main>
    </div>
  );
}

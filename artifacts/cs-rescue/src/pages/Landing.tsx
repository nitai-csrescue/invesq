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
  ArrowDown,
  GitBranch,
  Gauge,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoFull from "@/assets/invesq_logo_horizontal_trim.png";
import jayFoxPhoto from "@assets/Jay_Fox_1778727567891.jpeg";
import nitaiVinitzkyPhoto from "@/assets/nitai_no_bg.png";
import linkedinIcon from "@assets/clipart2670965_1778735741711.png";
import emailIcon from "@assets/green-gradient-home-solid-circle-icon-free-png_1778735744487.webp";

const PROBLEMS = [
  "Lower mid-market and growth equity firms lack the operational infrastructure to independently validate management-reported metrics.",
  "Traditional diligence relies on curated VDRs, spreadsheets, and management presentations that obscure underlying customer and operational issues.",
  "The result: post-close surprises tied to churn, implementation failures, poor adoption, revenue concentration, and operational scalability.",
];

const PILLARS = [
  {
    Icon: Brain,
    title: "Operational Intelligence Engine",
    body: "A proprietary analysis layer that ingests structured and unstructured signals from across the customer-facing stack and reconstructs what is actually happening inside the business.",
  },
  {
    Icon: GitBranch,
    title: "Customer Journey Reconstruction",
    body: "Stitches CRM, support, communication, BI, and product-usage data into a single end-to-end view of every account — exposing the gaps between reported metrics and lived experience.",
  },
  {
    Icon: ShieldCheck,
    title: "System-Level Validation",
    body: "Independent, system-of-record validation of management narratives — replacing curated VDRs and management decks with primary-source operational evidence.",
  },
  {
    Icon: Gauge,
    title: "Operational Risk Scoring",
    body: "An executive-grade risk score per account and per portfolio company, continuously refreshed from live systems and benchmarked against the rest of the book.",
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
    photo: jayFoxPhoto,
    body: "20+ years building GTM organizations at PE- and VC-backed technology companies. Previously led a 30+ person global Client Success org at TRG Screen prior to its acquisition by Vista Equity Partners.",
    email: "jay@csrescue.com",
    linkedin: "https://www.linkedin.com/in/jayelliotfox/",
  },
  {
    name: "Nitai Vinitzky",
    role: "Co-Founder",
    photo: nitaiVinitzkyPhoto,
    transparentPhoto: true,
    body: "10+ years leading enterprise SaaS implementations, integrations, and deployment strategy across fintech and compliance organizations including Nova Credit, Hearsay Systems, and iCIMS.",
    email: "nitai@csrescue.com",
    linkedin: "https://www.linkedin.com/in/nitai-vinitzky/",
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
      <header className="max-w-6xl mx-auto grid grid-cols-3 items-center mb-10">
        <div aria-hidden />
        <Link href="/" className="block justify-self-center" data-testid="brand-logo">
          {/*
            Render the logo at full color on a white panel — preserves the
            dark-navy Q and INVESQ wordmark exactly as the source artwork.
            The panel sits on the dark page with a soft cyan glow so it
            reads as a branded "card" rather than a stamped-on graphic.
          */}
          <div
            className="rounded-2xl bg-white px-7 py-5 md:px-10 md:py-6 shadow-2xl shadow-cyan-500/20 ring-1 ring-white/15"
            style={{
              filter: "drop-shadow(0 0 24px rgba(34, 211, 238, 0.25))",
            }}
          >
            <img
              src={logoFull}
              alt="INVESQ"
              className="h-14 md:h-20 w-auto select-none block"
              draggable={false}
            />
          </div>
        </Link>
        <nav className="flex items-center gap-2 justify-self-end">
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

      <main className="max-w-5xl mx-auto space-y-20">
        {/* Hero / Executive Summary */}
        <section className="text-center pt-2">
          <Badge variant="outline" className="text-cyan-300 border-cyan-400/30 mb-5">
            Executive Brief
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.05] max-w-4xl mx-auto">
            Operational Due Diligence for{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              Modern Investment Firms
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mt-6 max-w-2xl mx-auto leading-relaxed">
            INVESQ helps PE and VC firms uncover hidden customer journey, adoption, and operational
            risks before capital is committed.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 mt-8">
            <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2">
              <Link href="/dashboard">Explore a sample assessment <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/overview">Read the long-form pitch</Link>
            </Button>
          </div>

          {/* Sample insight — concrete, dashboard-style "this is what the product does" card */}
          <div className="mt-12 max-w-2xl mx-auto text-left">
            <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 backdrop-blur p-6 md:p-7 shadow-2xl shadow-cyan-500/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <p className="text-[11px] tracking-[0.2em] text-cyan-300 font-semibold">
                  SAMPLE OPERATIONAL SIGNAL
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-rose-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-base md:text-lg text-white font-semibold leading-snug">
                    Detected: 38% support escalation increase among top ARR accounts
                    despite reported NRR growth.
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      Source: Zendesk · Salesforce · Gainsight
                    </span>
                    <span>·</span>
                    <span>Risk score: <span className="text-rose-300 font-semibold">7.4 / 10</span></span>
                    <span>·</span>
                    <span>Confidence: 92%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Market Problem */}
        <section
          className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 md:p-10"
          data-testid="brief-market-problem"
        >
          <p className="text-sm text-cyan-300 font-semibold mb-3">The market problem</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight max-w-3xl">
            Diligence still depends on what management chooses to show.
          </h2>
          <ul className="space-y-3.5 max-w-3xl">
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
          className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 md:p-10"
          data-testid="brief-solution"
        >
          <p className="text-sm text-cyan-300 font-semibold mb-3">Our proposed solution</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight max-w-3xl">
            One operational risk profile, built from real system activity.
          </h2>
          <p className="text-slate-300 leading-relaxed max-w-3xl">
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

        {/* Core Product Pillars — proprietary methodology */}
        <section data-testid="brief-pillars">
          <p className="text-sm text-cyan-300 font-semibold mb-3 text-center">Our methodology</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-3 leading-tight tracking-tight">
            The INVESQ Operational Intelligence Stack.
          </h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-8 leading-relaxed">
            Four proprietary capabilities that together replace narrative-driven diligence with
            evidence-driven operational truth.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-7 hover:border-cyan-400/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-3">
                  <p.Icon className="w-5 h-5 text-cyan-300" />
                </div>
                <p className="text-lg font-semibold text-white">{p.title}</p>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Target ICP */}
        <section data-testid="brief-icp">
          <p className="text-sm text-cyan-300 font-semibold mb-3 text-center">Who we serve</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-8 leading-tight tracking-tight">
            Built for the firms doing the most operational work.
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
          <p className="text-sm text-cyan-300 font-semibold mb-3 text-center">Founding team</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-8 leading-tight tracking-tight">
            Operators who've lived this problem.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-6 flex items-start gap-4"
              >
                {/*
                  Nitai's photo had its background removed and is layered on
                  a soft light backdrop to match the bright outdoor feel of
                  Jay's original photo. Jay's keeps its original background.
                */}
                <div
                  className="w-16 h-16 rounded-full shrink-0 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-500/10 overflow-hidden"
                  style={
                    m.transparentPhoto
                      ? {
                          background:
                            "linear-gradient(160deg, #f3f4d6 0%, #d8e3b8 60%, #b9c984 100%)",
                        }
                      : undefined
                  }
                >
                  <img
                    src={m.photo}
                    alt={m.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">{m.name}</p>
                  <p className="text-xs text-cyan-300 mt-0.5">{m.role}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`mailto:${m.email}`}
                      aria-label={`Email ${m.name}`}
                      title={m.email}
                      className="inline-flex hover:opacity-80 transition-opacity"
                      data-testid={`team-email-${m.name.split(" ")[0].toLowerCase()}`}
                    >
                      <img src={emailIcon} alt="" className="w-6 h-6 rounded-full" />
                    </a>
                    <a
                      href={m.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${m.name} on LinkedIn`}
                      className="inline-flex hover:opacity-80 transition-opacity"
                      data-testid={`team-linkedin-${m.name.split(" ")[0].toLowerCase()}`}
                    >
                      <img src={linkedinIcon} alt="" className="w-6 h-6 rounded-full" />
                    </a>
                  </div>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Strategic Discussion Points */}
        <section
          className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 md:p-10"
          data-testid="brief-discussion"
        >
          <p className="text-sm text-cyan-300 font-semibold mb-3">Strategic discussion points</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight max-w-3xl">
            Open questions for our partners.
          </h2>
          <ul className="space-y-3 max-w-3xl">
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

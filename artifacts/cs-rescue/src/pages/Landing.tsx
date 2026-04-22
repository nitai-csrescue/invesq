import { Link } from "wouter";
import { ArrowRight, Sparkles, Database, Workflow, Shield, Zap, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyHero } from "@/components/cs/EmptyHero";

const FROM_TO = [
  { from: "Reactive — react to churn after it happens", to: "Predictive — surface risk weeks before renewal." },
  { from: "Spreadsheets and tribal knowledge", to: "Live signals from product, support, CRM, and warehouse." },
  { from: "Generic playbooks fired by hand", to: "Specific actions queued for the right CSM at the right moment." },
];

const STEPS = [
  { Icon: Database, title: "Data", body: "Stream events from CRM, product analytics, support, comms, and warehouse." },
  { Icon: Sparkles, title: "Insight", body: "AI pattern-matches across data sources and surfaces what matters." },
  { Icon: Workflow, title: "Action", body: "Triggers a playbook, queues a task, or briefs the CSM in seconds." },
];

const LOGOS = ["Wayne", "Stark", "Tyrell", "Hooli", "Massive Dynamic", "Aperture", "Black Mesa", "Globex"];

export default function Landing() {
  return (
    <div className="min-h-screen px-6 py-10" data-testid="landing-page">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <p className="font-bold text-lg text-white">CS Rescue</p>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
            <Link href="/overview">Investor pitch</Link>
          </Button>
          <Button asChild size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-1.5">
            <Link href="/dashboard" data-testid="cta-launch-app">Launch product <ArrowRight className="w-3.5 h-3.5" /></Link>
          </Button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto space-y-16">
        <EmptyHero
          eyebrow="Intelligence layer for customer success"
          title={<>Stop reacting to churn. <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">Predict it, brief on it, act on it.</span></>}
          subtitle="CS Rescue ingests every signal across your customer data — product, support, CRM, comms — and turns it into the next best action for your team. Less dashboard. More system of action."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2">
              <Link href="/dashboard">See the product <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/overview">Read the pitch</Link>
            </Button>
          </div>
        </EmptyHero>

        <section>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-3 text-center">From → To</p>
          <h2 className="text-2xl font-bold text-white text-center mb-8">The shift in customer success</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FROM_TO.map((it, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-xs text-slate-500 mb-2 line-through">{it.from}</p>
                <p className="text-sm text-white font-medium">{it.to}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-3 text-center">How it works</p>
          <h2 className="text-2xl font-bold text-white text-center mb-8">Data → Insight → Action</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-xl border border-white/10 bg-slate-950/40 p-6 relative">
                <div className="absolute top-3 right-4 text-5xl font-bold text-white/5">{i + 1}</div>
                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-3">
                  <s.Icon className="w-5 h-5 text-cyan-300" />
                </div>
                <p className="text-base font-semibold text-white">{s.title}</p>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-wider text-slate-500 text-center mb-4">Trusted by teams at</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {LOGOS.map((l) => (
              <span key={l} className="text-slate-500 text-sm font-semibold tracking-wide">{l}</span>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { Icon: Shield, title: "Enterprise-ready", body: "SSO, audit log, regional data residency." },
            { Icon: Zap, title: "Live in days", body: "Pre-built integrations + opinionated playbooks." },
            { Icon: LineChart, title: "Measurable lift", body: "+12 pts portfolio health · −45% time to value." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-white/10 bg-slate-950/40 p-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-cyan-300 shrink-0">
                <f.Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-slate-400 mt-1">{f.body}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-10 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white">Ready to see it run on your accounts?</h3>
          <p className="text-sm text-slate-300 mt-2 max-w-xl mx-auto">Open the demo workspace and step through the live dashboard, signals, and playbooks.</p>
          <Button asChild size="lg" className="mt-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2">
            <Link href="/dashboard" data-testid="cta-footer-launch">Launch the product <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </section>

        <footer className="text-center text-xs text-slate-600 pt-8 pb-4">
          © 2026 CS Rescue · Demo workspace
        </footer>
      </main>
    </div>
  );
}

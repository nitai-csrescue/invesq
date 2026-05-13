import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SECTIONS = [
  {
    id: "problem",
    eyebrow: "01 · Problem",
    headline: "Customer Success is still operating on lagging indicators.",
    body: "Most CS teams find out an account is at risk in the renewal call. Tools surface dashboards, not decisions — and adoption + churn signals live across 8+ disconnected systems.",
    bullets: ["Avg CS team monitors 6+ tools", "Health scores update weekly, at best", "Most renewals are surprises"],
    bigNumber: "$1.2T",
    bigNumberLabel: "Global SaaS revenue at retention risk",
  },
  {
    id: "insight",
    eyebrow: "02 · Insight",
    headline: "The signal is already in the data — it's the wiring that's missing.",
    body: "Every churn event has a footprint: a usage cliff, a champion who left, a P1 ticket that lingered. The footprints exist in product, CRM, support, comms — they just don't connect.",
    bullets: ["Usage cliffs precede 78% of churn", "Champion changes appear 60+ days before non-renewal", "Procurement involvement is detectable at week 1"],
    bigNumber: "78%",
    bigNumberLabel: "Of churn is preceded by detectable signals",
  },
  {
    id: "shift",
    eyebrow: "03 · Shift",
    headline: "The category shift: from CS analytics to a CS system of action.",
    body: "Dashboards were the previous generation. The new generation operates the function: signals trigger playbooks, playbooks queue actions, actions update the system of record.",
    bullets: ["Dashboards → Decisions", "Reports → Recommended actions", "Insights → Automated playbooks"],
    bigNumber: "10x",
    bigNumberLabel: "Action density vs. legacy CS tools",
  },
  {
    id: "solution",
    eyebrow: "04 · Solution",
    headline: "INVESQ: a Ground Truth layer that runs on top of the portfolio company's stack.",
    body: "We unify product, CRM, support, comms, and warehouse data. Our signal catalog detects 30+ patterns. Playbooks turn those signals into actions in your team's queue.",
    bullets: ["10+ pre-built integrations", "30+ signal patterns out of the box", "Human-in-the-loop playbook execution"],
    bigNumber: "13d",
    bigNumberLabel: "Median time-to-value for the platform itself",
  },
  {
    id: "how",
    eyebrow: "05 · How it works",
    headline: "Data → Insight → Action, in one closed loop.",
    body: "Stream events from your stack. Our pattern engine surfaces signals tied to specific accounts. Each signal triggers the right playbook for the right CSM, with full context.",
    bullets: ["Real-time event streaming", "AI Copilot brief on every account", "Bi-directional CRM sync"],
    bigNumber: "<2s",
    bigNumberLabel: "Signal-to-action latency",
  },
  {
    id: "win",
    eyebrow: "06 · Why we win",
    headline: "We're built for action, not for analysis.",
    body: "Legacy CS tools optimize for the analyst. We optimize for the CSM in the queue and the VP at the QBR. Every screen ends in an action you can take.",
    bullets: ["No 'just a dashboard' surface", "Persona-aware UX (CSM / VP / AE)", "Action-first information architecture"],
    bigNumber: "+18 pts",
    bigNumberLabel: "Avg health-score lift in 90 days",
  },
  {
    id: "vision",
    eyebrow: "07 · Vision",
    headline: "The intelligence layer for every customer-facing function.",
    body: "Customer Success today. Account Management, Renewals, Sales-Assist tomorrow. Anywhere humans make decisions on top of customer data.",
    bullets: ["Land in CS · Expand to Sales-Assist", "Vertical-specific signal libraries", "Open signal API for partners"],
    bigNumber: "$8B",
    bigNumberLabel: "Estimated TAM by 2028",
  },
];

export default function Overview() {
  return (
    <div className="min-h-screen px-6 py-10" data-testid="overview-page">
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-12">
        <Link href="/" className="text-slate-300 hover:text-white inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to landing
        </Link>
        <Button asChild size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-1.5">
          <Link href="/dashboard">Open product <ArrowRight className="w-3.5 h-3.5" /></Link>
        </Button>
      </header>

      <main className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="text-cyan-300 border-cyan-400/30 mb-4">Investor overview</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">INVESQ</h1>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">A 7-section narrative of the problem, the shift, and where we're headed.</p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s, i) => (
            <section
              key={s.id}
              className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8"
              data-testid={`overview-section-${s.id}`}
            >
              <div className="lg:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-semibold">{s.eyebrow}</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 leading-tight">{s.headline}</h2>
                <p className="text-base text-slate-300 mt-4 leading-relaxed">{s.body}</p>
                <ul className="mt-4 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 p-5 flex flex-col items-start justify-center">
                <p className="text-5xl md:text-6xl font-bold text-white tracking-tight">{s.bigNumber}</p>
                <p className="text-xs text-slate-300 mt-2 leading-snug">{s.bigNumberLabel}</p>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-10 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white">See it running on a fictional book of business.</h3>
          <p className="text-sm text-slate-300 mt-2">18 demo accounts, 30+ signals, 10 playbooks, end-to-end flow.</p>
          <Button asChild size="lg" className="mt-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2">
            <Link href="/dashboard">Open the dashboard <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </section>

        <footer className="text-center text-xs text-slate-600 pt-12 pb-4">
          © 2026 INVESQ · Investor overview
        </footer>
      </main>
    </div>
  );
}
